import {
  getFirebaseAdmin,
  isFirebaseConfigured,
} from "../firebase.js";
import { supabaseAdmin } from "../supabase/supabase.js";

/**
 * Dual authentication middleware that supports both Firebase and Supabase tokens
 * Tries Supabase first, then falls back to Firebase for backward compatibility
 */
async function verifyIdTokenInner(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split("Bearer ")[1];

  if (!token) {
    console.warn("[auth] missing token", {
      path: req.originalUrl,
      hasAuthHeader: Boolean(authHeader),
    });
    return res.status(403).json({
      success: false,
      message: "Unauthorized: No authentication token provided",
    });
  }

  // Try Supabase authentication first (for new users)
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      const user = data?.user;

      if (!error && user) {
        req.user = {
          uid: user.id,
          supabaseUid: user.id,
          email: user.email,
          name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0],
          picture:
            user.user_metadata?.avatar_url ||
            user.user_metadata?.picture ||
            "",
          authProvider: "supabase",
        };
        return next();
      }
      if (error) {
        console.warn("[auth] supabase auth failed", {
          path: req.originalUrl,
          message: error.message,
          status: error.status,
        });
      }
    } catch (supabaseError) {
      console.warn("[auth] supabase auth error", {
        path: req.originalUrl,
        message: supabaseError?.message,
      });
    }
  }

  // Fall back to Firebase authentication (for existing users)
  if (!isFirebaseConfigured()) {
    return res.status(403).json({
      success: false,
      message: "Unauthorized: Invalid or expired authentication token",
      code: "AUTH_FAILED",
    });
  }

  try {
    const decodedToken = await getFirebaseAdmin().auth().verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      firebaseUid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.email?.split("@")[0],
      picture: decodedToken.picture || "",
      authProvider: "firebase",
      ...decodedToken,
    };
    return next();
  } catch (error) {
    if (error.code === "auth/id-token-expired") {
      return res.status(403).json({
        success: false,
        message: "Token expired. Please log out and log back in.",
        code: "TOKEN_EXPIRED",
      });
    }

    return res.status(403).json({
      success: false,
      message: "Unauthorized: Invalid or expired authentication token",
      code: "AUTH_FAILED",
    });
  }
}

/**
 * Express 4: wrap async middleware so rejections become 500 instead of silent failures.
 */
function verifyIdToken(req, res, next) {
  verifyIdTokenInner(req, res, next).catch((err) => {
    console.error("[auth] verifyIdToken unexpected error:", err?.message || err);
    if (res.headersSent) return;
    res.status(500).json({
      success: false,
      message: "Server error while verifying authentication",
    });
  });
}

export { verifyIdToken };
