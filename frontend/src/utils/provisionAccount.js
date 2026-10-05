import { API_ENDPOINTS, apiClient } from "../config/api";

const RECENT_CREATE_MS = 60_000;

/** uid/supabaseUid/firebaseUid -> timestamp of a created:true provision. */
const recentCreates = new Map();
let inflight = null;

const userIds = (user) =>
  [user?.uid, user?.supabaseUid, user?.firebaseUid].filter(Boolean);

const rememberCreated = (payload) => {
  if (payload?.created !== true) return;
  const now = Date.now();
  for (const id of userIds(payload.data)) {
    recentCreates.set(id, now);
  }
};

export const wasAccountCreatedRecently = (user, now = Date.now()) => {
  for (const id of userIds(user)) {
    const at = recentCreates.get(id);
    if (at != null && now - at >= 0 && now - at < RECENT_CREATE_MS) {
      return true;
    }
  }
  return false;
};

/**
 * One in-flight POST /api/protected per page. AuthCallback and the signed-in
 * bootstrap both provision; sharing the request keeps a single created flag.
 */
export const provisionAccount = () => {
  if (inflight) return inflight;
  inflight = apiClient
    .post(API_ENDPOINTS.PROTECTED)
    .then((response) => {
      rememberCreated(response?.data);
      return response;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
};
