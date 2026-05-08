import { API_ENDPOINTS, apiClient } from "../config/api";

/** One in-flight GET profile-image per uid (many ProductCards share the same promise). */
const inflight = new Map();
const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;
const storageKey = (uid) => `profile-snippet:v1:${uid}`;

const writeStoredSnippet = (uid, value) => {
  try {
    localStorage.setItem(storageKey(uid), JSON.stringify(value));
  } catch {
    // Best effort only; in-memory cache still dedupes this session.
  }
};

const readStoredSnippet = (uid) => {
  try {
    const raw = localStorage.getItem(storageKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.cachedAt || !parsed?.data) return null;
    if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) {
      localStorage.removeItem(storageKey(uid));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const toResponse = (data) => ({
  data: {
    success: true,
    data,
  },
});

export const setCachedProfileSnippet = (uid, snippet) => {
  if (!uid || !snippet) return;
  const value = {
    cachedAt: Date.now(),
    data: {
      picture: snippet.profileImage || snippet.picture || null,
      name: snippet.name || (!snippet.isUsername ? snippet.displayName : null),
      username:
        snippet.username || (snippet.isUsername ? snippet.displayName : null),
    },
  };
  cache.set(uid, value);
  writeStoredSnippet(uid, value);
};

export const getCachedProfileSnippet = (uid) => {
  const cached = cache.get(uid) || readStoredSnippet(uid);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > CACHE_TTL_MS) {
    cache.delete(uid);
    return null;
  }
  cache.set(uid, cached);
  return cached.data;
};

/**
 * @param {string} uid
 * @returns {Promise<import("axios").AxiosResponse>}
 */
export const getProfileImageRequestDeduped = (uid) => {
  if (!uid) {
    return Promise.reject(new Error("missing uid"));
  }
  const cached = getCachedProfileSnippet(uid);
  if (cached) {
    return Promise.resolve(toResponse(cached));
  }
  const existing = inflight.get(uid);
  if (existing) {
    return existing;
  }
  const promise = apiClient
    .get(API_ENDPOINTS.PROFILE_IMAGE(uid))
    .then((response) => {
      if (response.data?.success && response.data?.data) {
        const value = { cachedAt: Date.now(), data: response.data.data };
        cache.set(uid, value);
        writeStoredSnippet(uid, value);
      }
      return response;
    })
    .finally(() => {
      inflight.delete(uid);
    });
  inflight.set(uid, promise);
  return promise;
};
