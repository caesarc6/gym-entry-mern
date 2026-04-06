import { admin } from "../firebase.js";
import { supabaseAdmin } from "../supabase/supabase.js";

/**
 * Dual authentication middleware that supports both Firebase and Supabase tokens
 * Tries Supabase first, then falls back to Firebase for backward compatibility
 */
async function verifyIdToken(req, res, next) {
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
      // Supabase tokens can be verified using getUser with the access token
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      
      if (!error && user) {
        // Supabase authentication successful
        req.user = {
          uid: user.id,
          supabaseUid: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0],
          picture: user.user_metadata?.avatar_url || user.user_metadata?.picture || "",
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
      // If Supabase verification fails, try Firebase (for backward compatibility)
      // Continue to Firebase verification below
    }
  }

  // Fall back to Firebase authentication (for existing users)
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      firebaseUid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.email?.split("@")[0],
      picture: decodedToken.picture || "",
      authProvider: "firebase",
      ...decodedToken, // Include all Firebase token fields for backward compatibility
    };
    return next();
  } catch (error) {
    // Provide more specific error messages
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

// Example usage in an Express route
// import express from "express";
// import User from "../models/user.model.js"; //Assuming you have a User model

// const app = express();

// app.post("/api/protected", verifyIdToken, async (req, res) => {
//   const { uid, name, email, picture } = req.user;

//   let user = await User.findOne({ uid });

//   if (!user) {
//     user = new User({
//       uid,
//       name,
//       email,
//       picture,
//     });
//     await user.save();
//   }
//   res.send(user);
// });

export { verifyIdToken };
