import { API_ENDPOINTS, apiClient } from "../config/api";

/** One in-flight GET profile-image per uid (many ProductCards share the same promise). */
const inflight = new Map();

/**
 * @param {string} uid
 * @returns {Promise<import("axios").AxiosResponse>}
 */
export const getProfileImageRequestDeduped = (uid) => {
  if (!uid) {
    return Promise.reject(new Error("missing uid"));
  }
  const existing = inflight.get(uid);
  if (existing) {
    return existing;
  }
  const promise = apiClient
    .get(API_ENDPOINTS.PROFILE_IMAGE(uid))
    .finally(() => {
      inflight.delete(uid);
    });
  inflight.set(uid, promise);
  return promise;
};
