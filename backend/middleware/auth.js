import {
  getFirebaseAdmin,
  isFirebaseConfigured,
} from "../firebase.js";
import { supabaseAdmin } from "../supabase/supabase.js";
import {
  createRemoteJWKSet,
  decodeJwt,
  decodeProtectedHeader,
  jwtVerify,
} from "jose";

/**
 * Dual authentication middleware that supports both Firebase and Supabase tokens.
 * Prefer local verification so every protected API call does not depend on a
 * remote Supabase Auth request.
 */
const getSupabaseJwks = (() => {
  let jwks = null;
  return () => {
    if (jwks) return jwks;
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) return null;
    const issuer = `${supabaseUrl.replace(/\/$/, "")}/auth/v1`;
    const jwksUrl = new URL(`${issuer}/.well-known/jwks.json`);
    jwks = createRemoteJWKSet(jwksUrl);
    return jwks;
  };
})();

const SUPABASE_TOKEN_CACHE_MAX_AGE_MS = 5 * 60 * 1000;
const SUPABASE_TOKEN_CACHE_MAX_ENTRIES = 200;
const SUPABASE_REMOTE_AUTH_TIMEOUT_MS = 4_000;
const supabaseTokenCache = new Map();

const withTimeout = (promise, timeoutMs, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs)
    ),
  ]);

const buildSupabaseReqUser = (user) => ({
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
});

const getCachedSupabaseUser = (token) => {
  const cached = supabaseTokenCache.get(token);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    supabaseTokenCache.delete(token);
    return null;
  }
  return cached.user;
};

const setCachedSupabaseUser = (token, user) => {
  let tokenExpiresAt = Date.now() + SUPABASE_TOKEN_CACHE_MAX_AGE_MS;
  try {
    const payload = decodeJwt(token);
    if (payload.exp) tokenExpiresAt = Math.min(tokenExpiresAt, payload.exp * 1000);
  } catch {
    // Keep the conservative max-age when the token cannot be decoded.
  }

  supabaseTokenCache.set(token, {
    user,
    expiresAt: tokenExpiresAt,
  });

  if (supabaseTokenCache.size > SUPABASE_TOKEN_CACHE_MAX_ENTRIES) {
    const oldestKey = supabaseTokenCache.keys().next().value;
    if (oldestKey) supabaseTokenCache.delete(oldestKey);
  }
};

const getTokenAlg = (token) => {
  try {
    return decodeProtectedHeader(token)?.alg;
  } catch {
    return null;
  }
};

async function tryVerifySupabaseJwt(token) {
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) return null;

  const issuer = `${supabaseUrl.replace(/\/$/, "")}/auth/v1`;
  const tokenAlg = getTokenAlg(token);

  if (process.env.SUPABASE_JWT_SECRET) {
    try {
      const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);
      const { payload } = await jwtVerify(token, secret, { issuer });
      if (!payload?.sub) return null;
      return payload;
    } catch (error) {
      console.warn("[auth] supabase jwt secret verify failed", {
        message: error?.message,
        code: error?.code,
      });
    }
  }

  if (tokenAlg?.startsWith("HS")) {
    console.warn("[auth] supabase jwt secret missing or invalid for HS token", {
      alg: tokenAlg,
      hasJwtSecret: Boolean(process.env.SUPABASE_JWT_SECRET),
    });
    return null;
  }

  const jwks = getSupabaseJwks();
  if (!jwks) return null;

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer,
    });
    if (!payload?.sub) return null;
    return payload;
  } catch (error) {
    console.warn("[auth] supabase jwt verify failed", {
      message: error?.message,
      code: error?.code,
    });
    return null;
  }
}

const buildSupabaseReqUserFromPayload = (payload) => ({
  uid: payload.sub,
  supabaseUid: payload.sub,
  email: payload.email,
  name:
    payload.user_metadata?.full_name ||
    payload.user_metadata?.name ||
    payload.email?.split("@")[0],
  picture:
    payload.user_metadata?.avatar_url ||
    payload.user_metadata?.picture ||
    "",
  authProvider: "supabase",
});

async function verifyIdTokenInner(req, res, next) {
  const authStartedAt = Date.now();
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

  const cachedUser = getCachedSupabaseUser(token);
  if (cachedUser) {
    req.user = cachedUser;
    req.authDurationMs = Date.now() - authStartedAt;
    res.setHeader("Server-Timing", `auth;dur=${req.authDurationMs}`);
    return next();
  }

  const supabasePayload = await tryVerifySupabaseJwt(token);
  if (supabasePayload) {
    req.user = buildSupabaseReqUserFromPayload(supabasePayload);
    setCachedSupabaseUser(token, req.user);
    req.authDurationMs = Date.now() - authStartedAt;
    res.setHeader("Server-Timing", `auth;dur=${req.authDurationMs}`);
    return next();
  }

  // Fall back to Supabase Auth API only when local verification is unavailable.
  if (supabaseAdmin) {
    try {
      const { data, error } = await withTimeout(
        supabaseAdmin.auth.getUser(token),
        SUPABASE_REMOTE_AUTH_TIMEOUT_MS,
        "Supabase remote auth"
      );
      const user = data?.user;

      if (!error && user) {
        req.user = buildSupabaseReqUser(user);
        setCachedSupabaseUser(token, req.user);
        req.authDurationMs = Date.now() - authStartedAt;
        res.setHeader("Server-Timing", `auth;dur=${req.authDurationMs}`);
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
    req.authDurationMs = Date.now() - authStartedAt;
    res.setHeader("Server-Timing", `auth;dur=${req.authDurationMs}`);
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
