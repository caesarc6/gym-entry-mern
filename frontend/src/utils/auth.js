/**
 * Dual authentication utility
 * Supports both Firebase and Supabase auth for migration period
 */

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { supabase } from "../supabase/supabase";

const withTimeout = (promise, timeoutMs, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs)
    ),
  ]);

const getSupabaseStorageKey = () => {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL;
    if (!url) return null;
    const ref = new URL(url).hostname.split(".")[0];
    return ref ? `sb-${ref}-auth-token` : null;
  } catch (error) {
    return null;
  }
};

const clearSupabaseAuthStorage = () => {
  try {
    const key = getSupabaseStorageKey();
    const keysToRemove = new Set();

    if (key) {
      keysToRemove.add(key);
    }

    const shouldRemoveKey = (storageKey) =>
      storageKey.startsWith("sb-") && storageKey.endsWith("-auth-token");

    for (let i = 0; i < localStorage.length; i += 1) {
      const storageKey = localStorage.key(i);
      if (storageKey && shouldRemoveKey(storageKey)) {
        keysToRemove.add(storageKey);
      }
    }

    for (let i = 0; i < sessionStorage.length; i += 1) {
      const storageKey = sessionStorage.key(i);
      if (storageKey && shouldRemoveKey(storageKey)) {
        keysToRemove.add(storageKey);
      }
    }

    keysToRemove.forEach((storageKey) => {
      localStorage.removeItem(storageKey);
      sessionStorage.removeItem(storageKey);
    });
  } catch (error) {
    // Ignore storage access errors (privacy mode, disabled storage)
  }
};

const shouldClearSupabaseSession = (error) =>
  error && (error.status === 401 || error.status === 403);

const AUTH_REDIRECT_KEY = "auth:redirect";
const AUTH_MODE_KEY = "auth:mode";
const AUTH_DEBUG_KEY = "auth:debug";
const AUTH_TEMP_TOKEN_KEY = "auth:temp-access-token";
const AUTH_TEMP_REFRESH_KEY = "auth:temp-refresh-token";
const AUTH_TEMP_EXPIRES_KEY = "auth:temp-expires-at";
const SUPABASE_AUTH_KEY_PATTERN = /^sb-.*-auth-token$/;

export const setAuthRedirect = (mode, redirectTo) => {
  try {
    if (mode) {
      localStorage.setItem(AUTH_MODE_KEY, mode);
    }
    if (redirectTo) {
      localStorage.setItem(AUTH_REDIRECT_KEY, redirectTo);
    }
  } catch (error) {
    // Ignore storage errors
  }
};

export const setTempSupabaseSession = (accessToken, refreshToken, expiresAt) => {
  try {
    if (accessToken) {
      localStorage.setItem(AUTH_TEMP_TOKEN_KEY, accessToken);
    }
    if (refreshToken) {
      localStorage.setItem(AUTH_TEMP_REFRESH_KEY, refreshToken);
    }
    if (expiresAt) {
      localStorage.setItem(AUTH_TEMP_EXPIRES_KEY, String(expiresAt));
    }
  } catch (error) {
    // Ignore storage errors
  }
};

export const getTempAccessToken = () => {
  try {
    const token = localStorage.getItem(AUTH_TEMP_TOKEN_KEY);
    const expiresAtRaw = localStorage.getItem(AUTH_TEMP_EXPIRES_KEY);
    if (!token || !expiresAtRaw) {
      return null;
    }
    const expiresAt = Number(expiresAtRaw);
    if (!Number.isFinite(expiresAt)) {
      return null;
    }
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (expiresAt <= nowSeconds) {
      return null;
    }
    return token;
  } catch (error) {
    return null;
  }
};

export const getStoredSupabaseAccessToken = () => {
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (!SUPABASE_AUTH_KEY_PATTERN.test(key)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed?.access_token) {
        return parsed.access_token;
      }
    }
  } catch (error) {
    // Ignore storage errors
  }
  return null;
};

export const clearTempSupabaseSession = () => {
  try {
    localStorage.removeItem(AUTH_TEMP_TOKEN_KEY);
    localStorage.removeItem(AUTH_TEMP_REFRESH_KEY);
    localStorage.removeItem(AUTH_TEMP_EXPIRES_KEY);
  } catch (error) {
    // Ignore storage errors
  }
};

export const consumeAuthRedirect = () => {
  try {
    const mode = localStorage.getItem(AUTH_MODE_KEY) || null;
    const redirectTo = localStorage.getItem(AUTH_REDIRECT_KEY) || null;
    localStorage.removeItem(AUTH_MODE_KEY);
    localStorage.removeItem(AUTH_REDIRECT_KEY);
    return { mode, redirectTo };
  } catch (error) {
    return { mode: null, redirectTo: null };
  }
};

export const pushAuthDebug = (message, data = null) => {
  try {
    const existing = JSON.parse(localStorage.getItem(AUTH_DEBUG_KEY) || "[]");
    const entry = {
      at: new Date().toISOString(),
      message,
      data,
    };
    const next = [...existing, entry].slice(-50);
    localStorage.setItem(AUTH_DEBUG_KEY, JSON.stringify(next));
  } catch (error) {
    // Ignore storage errors
  }
};

export const readAuthDebug = () => {
  try {
    return JSON.parse(localStorage.getItem(AUTH_DEBUG_KEY) || "[]");
  } catch (error) {
    return [];
  }
};

export const clearAuthDebug = () => {
  try {
    localStorage.removeItem(AUTH_DEBUG_KEY);
  } catch (error) {
    // Ignore storage errors
  }
};

/** Coalesce parallel token resolution (many Axios interceptors + effects at once). */
let getAuthTokenInflight = null;

const resolveAuthToken = async () => {
  const tempToken = getTempAccessToken();
  const storedToken = getStoredSupabaseAccessToken();
  try {
    const {
      data: { session },
    } = await withTimeout(supabase.auth.getSession(), 5000, "Supabase session");
    if (session?.access_token) {
      return session.access_token;
    }
    if (tempToken) {
      return tempToken;
    }
    if (storedToken) {
      return storedToken;
    }

    const {
      data: { session: refreshedSession },
      error: refreshError,
    } = await withTimeout(
      supabase.auth.refreshSession(),
      5000,
      "Supabase refresh"
    );
    if (refreshError) {
      if (shouldClearSupabaseSession(refreshError)) {
        clearSupabaseAuthStorage();
      }
    } else if (refreshedSession?.access_token) {
      return refreshedSession.access_token;
    }
  } catch (error) {
    if (shouldClearSupabaseSession(error)) {
      clearSupabaseAuthStorage();
    }
    if (tempToken) {
      return tempToken;
    }
    if (storedToken) {
      return storedToken;
    }
  }

  try {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken(false);
      if (token) {
        return token;
      }
    }
  } catch (error) {
    // Firebase not available or no user
  }

  return null;
};

/**
 * Get the current authentication token (Firebase or Supabase)
 * @returns {Promise<string|null>} The authentication token or null
 */
export const getAuthToken = async () => {
  if (getAuthTokenInflight) {
    return getAuthTokenInflight;
  }
  getAuthTokenInflight = resolveAuthToken().finally(() => {
    getAuthTokenInflight = null;
  });
  return getAuthTokenInflight;
};

const mapSupabaseUserRecord = (user) => {
  if (!user) return null;
  return {
    uid: user.id,
    email: user.email,
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0],
    picture: user.user_metadata?.avatar_url || user.user_metadata?.picture || "",
    authProvider: "supabase",
  };
};

const waitForFirebaseAuthInit = () =>
  new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, () => {
      unsub();
      resolve();
    });
  });

/** Coalesce parallel user resolution (header, home, store, interceptors). */
let getCurrentAuthUserInflight = null;

const resolveCurrentAuthUser = async () => {
  try {
    const {
      data: { session },
    } = await withTimeout(supabase.auth.getSession(), 5000, "Supabase session");
    const fromSession = mapSupabaseUserRecord(session?.user);
    if (fromSession) {
      return fromSession;
    }
  } catch (error) {
    if (shouldClearSupabaseSession(error)) {
      clearSupabaseAuthStorage();
    }
  }

  try {
    const {
      data: { user },
    } = await withTimeout(supabase.auth.getUser(), 5000, "Supabase user");
    const mapped = mapSupabaseUserRecord(user);
    if (mapped) {
      return mapped;
    }
  } catch (error) {
    if (shouldClearSupabaseSession(error)) {
      clearSupabaseAuthStorage();
    }
  }

  try {
    await withTimeout(waitForFirebaseAuthInit(), 5000, "Firebase auth init");
    if (auth.currentUser) {
      return {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        name: auth.currentUser.displayName || auth.currentUser.email?.split("@")[0],
        picture: auth.currentUser.photoURL || "",
        authProvider: "firebase",
      };
    }
  } catch (error) {
    // Firebase not available
  }

  return null;
};

/**
 * Get the current user from either Firebase or Supabase
 * Uses local Supabase session first (fast), then server validation, then Firebase after persistence loads.
 * @returns {Promise<Object|null>} The current user object or null
 */
export const getCurrentAuthUser = async () => {
  if (getCurrentAuthUserInflight) {
    return getCurrentAuthUserInflight;
  }
  getCurrentAuthUserInflight = resolveCurrentAuthUser().finally(() => {
    getCurrentAuthUserInflight = null;
  });
  return getCurrentAuthUserInflight;
};

/**
 * Sign out from both Firebase and Supabase
 */
export const signOutAll = async () => {
  getAuthTokenInflight = null;
  getCurrentAuthUserInflight = null;
  try {
    await supabase.auth.signOut();
    clearSupabaseAuthStorage();
    clearTempSupabaseSession();
  } catch (error) {
    // Ignore Supabase sign out errors
  }

  try {
    await auth.signOut();
  } catch (error) {
    // Ignore Firebase sign out errors
  }
};

/**
 * Check if user is authenticated with either provider
 * @returns {Promise<boolean>}
 */
export const isAuthenticated = async () => {
  const user = await getCurrentAuthUser();
  return !!user;
};
