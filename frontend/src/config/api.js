// API Configuration
const getApiBaseUrl = () => {
  const isCapacitorNative =
    typeof window !== "undefined" &&
    window.Capacitor &&
    typeof window.Capacitor.isNativePlatform === "function" &&
    window.Capacitor.isNativePlatform();

  // Capacitor + Vite live reload runs in a WebView at http://LAN:5173. Calling
  // the deployed API from that origin is blocked by CORS (Axios ERR_NETWORK).
  // Keep requests same-origin so Vite can proxy /api.
  if (isCapacitorNative && import.meta.env.DEV) {
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin;
    }
  }

  // In Capacitor native production builds, ALWAYS prefer an explicit API base URL
  // (or a known deployed URL). Defaulting to localhost will break on iOS.
  if (isCapacitorNative) {
    return (
      import.meta.env.VITE_API_BASE_URL ||
      "https://gym-entry-mern.vercel.app"
    );
  }

  // Check if we're in development mode
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";
  }

  // In production, use the environment variable or fallback to the current deployment URL
  const apiUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;

  return apiUrl;
};

export const API_BASE_URL = getApiBaseUrl();

// Helper function to build API endpoints
export const buildApiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/api/${cleanEndpoint}`;
};

// Common API endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  PROTECTED: buildApiUrl("protected"),
  GET_CURRENT_USER: buildApiUrl("getCurrentUser"),

  // User endpoints
  GET_USER_PROFILE: (uid, { includePosts = false } = {}) =>
    buildApiUrl(
      `getUserProfile/${uid}?includePosts=${includePosts ? "true" : "false"}`,
    ),
  UPDATE_USER_PROFILE: buildApiUrl("updateUserProfile"),
  UPDATE_USER_BACKGROUND: buildApiUrl("updateUserBackgroundPicture"),
  GET_CURRENT_MONGODB_USER: buildApiUrl("getCurrentMongoDBUser"),

  // Profile image endpoints
  PROFILE_IMAGE: (uid) => buildApiUrl(`profile-image/${uid}`),
  UPLOAD_PROFILE_PIC: buildApiUrl("updateUserProfilePic"),

  // Posts/Entries endpoints
  HOME_FEED: (page = 1, pageLimit = 6, includeCount = true) =>
    buildApiUrl(
      `posts/home-feed?page=${page}&limit=${pageLimit}&includeCount=${includeCount}`,
    ),
  POSTS: (uid, page = 1, limit = 10) =>
    buildApiUrl(`posts/${uid}?page=${page}&limit=${limit}`),
  CREATE_POST: buildApiUrl("posts"),
  DELETE_ENTRY: (id) => buildApiUrl(`entrys/${id}`),
  UPDATE_ENTRY: (id) => buildApiUrl(`entrys/${id}`),
  ENTRY_EDIT_DRAFT: (id) => buildApiUrl(`entrys/${id}/draft`),
  LIKE_ENTRY: (id) => buildApiUrl(`entrys/${id}/like`),
  COMMENT_ENTRY: (id) => buildApiUrl(`entrys/${id}/comment`),
  ENTRY_COMMENTS: (id) => buildApiUrl(`entrys/${id}/comments`),
  LIKE_COMMENT: (entryId, commentId) =>
    buildApiUrl(`entrys/${entryId}/comments/${commentId}/like`),
  REPLY_TO_COMMENT: (entryId, commentId) =>
    buildApiUrl(`entrys/${entryId}/comments/${commentId}/reply`),
  EDIT_COMMENT: (entryId, commentId) =>
    buildApiUrl(`entrys/${entryId}/comments/${commentId}`),
  DELETE_COMMENT: (entryId, commentId) =>
    buildApiUrl(`entrys/${entryId}/comments/${commentId}`),

  // Follow endpoints
  FOLLOW_REQUEST: (userId) => buildApiUrl(`follow-request/${userId}`),
  FOLLOW_REQUEST_STATUS: (userId) =>
    buildApiUrl(`follow-request/status/${userId}`),
  FOLLOW_REQUESTS_PENDING: buildApiUrl("follow-requests/pending"),
  FOLLOW_REQUEST_ACTION: (requestId, action) =>
    buildApiUrl(`follow-request/${requestId}/${action}`),
  UNFOLLOW: (userId) => buildApiUrl(`unfollow/${userId}`),
  USERS_FOLLOWERS: (userId) => buildApiUrl(`users/${userId}/followers`),
  USERS_FOLLOWING: (userId) => buildApiUrl(`users/${userId}/following`),

  // Privacy endpoints
  PRIVACY: buildApiUrl("privacy"),
  DELETE_ACCOUNT: buildApiUrl("account"),

  // Trainer dashboard access endpoints
  CHECK_TRAINER_DASHBOARD_ACCESS: buildApiUrl("trainer-dashboard/access"),

  // Admin endpoints
  CHECK_IS_ADMIN: buildApiUrl("admin/check"),
  GET_TRAINER_DASHBOARD_REQUESTS: buildApiUrl(
    "admin/trainer-dashboard-requests",
  ),
  APPROVE_TRAINER_DASHBOARD_ACCESS: (userId) =>
    buildApiUrl(`admin/trainer-dashboard/approve/${userId}`),
  REJECT_TRAINER_DASHBOARD_ACCESS: (userId) =>
    buildApiUrl(`admin/trainer-dashboard/reject/${userId}`),

  // Search endpoints
  SEARCH_USERS: (query) =>
    buildApiUrl(`searchUsers?query=${encodeURIComponent(query)}`),

  // Workout analytics endpoints
  GET_WORKOUTS: buildApiUrl("workouts"),
  PROCESS_WORKOUT: (entryId) => buildApiUrl(`workouts/process/${entryId}`),
  WORKOUT_ANALYTICS: (timeframe = "30d", exercise) => {
    const params = new URLSearchParams({ timeframe });
    if (exercise) params.append("exercise", exercise);
    return buildApiUrl(`workouts/analytics?${params.toString()}`);
  },
  EXERCISE_PROGRESS: (exercise, timeframe = "30d") =>
    buildApiUrl(
      `workouts/progress?exercise=${encodeURIComponent(
        exercise,
      )}&timeframe=${timeframe}`,
    ),
  PERSONAL_RECORDS: buildApiUrl("workouts/prs"),
  WORKOUT_HABIT_SUMMARY: buildApiUrl("workout-habit-summary"),

  // Workout sharing endpoints
  SHARE_WORKOUT: (entryId) => buildApiUrl(`entrys/${entryId}/share`),

  // Shared Workout endpoints
  CREATE_SHARED_WORKOUT: buildApiUrl("shared-workouts"),
  GET_TRAINER_SHARED_WORKOUTS: buildApiUrl("shared-workouts/trainer"),
  UPDATE_SHARED_WORKOUT: (sharedWorkoutId) =>
    buildApiUrl(`shared-workouts/${sharedWorkoutId}`),
  DELETE_SHARED_WORKOUT: (sharedWorkoutId) =>
    buildApiUrl(`shared-workouts/${sharedWorkoutId}`),

  // Sharing endpoints
  GET_TRAINER_ASSIGNMENTS: buildApiUrl("shared-workouts/assignments/trainer"),
  GET_TRAINER_CLIENTS: buildApiUrl("shared-workouts/clients"),
  CONTINUE_ASSIGNED_WORKOUT: (assignmentId) =>
    buildApiUrl(`shared-workouts/assignments/${assignmentId}/continue`),
  COMPLETE_ASSIGNED_WORKOUT: (assignmentId) =>
    buildApiUrl(`shared-workouts/assignments/${assignmentId}/complete`),
  CHECK_PENDING_WORKOUTS: buildApiUrl("shared-workouts/check-pending"),
  CLAIM_PENDING_WORKOUTS: buildApiUrl("shared-workouts/claim-pending"),

  // Shareable link endpoints
  GENERATE_SHAREABLE_LINK: (sharedWorkoutId) =>
    buildApiUrl(`shared-workouts/${sharedWorkoutId}/generate-link`),
  GET_SHARED_WORKOUT_BY_TOKEN: (shareToken) =>
    buildApiUrl(`shared-workouts/shared/${shareToken}`),
  SAVE_SHARED_WORKOUT_BY_TOKEN: (shareToken) =>
    buildApiUrl(`shared-workouts/shared/${shareToken}/save`),

  // Client shareable link endpoints (for all workouts under a client name)
  GENERATE_CLIENT_SHAREABLE_LINK: buildApiUrl(
    "shared-workouts/generate-client-link",
  ),
  GET_CLIENT_WORKOUTS_BY_TOKEN: (shareToken) =>
    buildApiUrl(`shared-workouts/client-claim/${shareToken}`),
  CLAIM_CLIENT_WORKOUTS_BY_TOKEN: (shareToken) =>
    buildApiUrl(`shared-workouts/client-claim/${shareToken}/claim`),

  // Migration endpoints
  MIGRATION_LINK: buildApiUrl("migration/link"),
};

// Axios instance with default configuration
import axios from "axios";
import {
  isRejectedAuthToken,
  messageFromApiError,
} from "../utils/apiErrorMessage";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout to 30 seconds
  headers: {
    "Content-Type": "application/json",
  },
});

function requestAlreadyHasAuthHeader(config) {
  const h = config.headers;
  if (!h) return false;
  if (h.Authorization || h.authorization) return true;
  if (typeof h.get === "function") {
    return Boolean(h.get("Authorization") || h.get("authorization"));
  }
  return false;
}

// Request interceptor to add auth token (supports both Firebase and Supabase)
apiClient.interceptors.request.use(
  async (config) => {
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      const h = config.headers;
      if (h && typeof h.delete === "function") {
        h.delete("Content-Type");
      } else if (h) {
        delete h["Content-Type"];
        delete h["content-type"];
      }
    }
    if (requestAlreadyHasAuthHeader(config)) {
      return config;
    }
    try {
      // Use dual-auth utility to get token from either provider
      const {
        getAuthToken,
        getTempAccessToken,
        getStoredSupabaseAccessToken,
      } = await import("../utils/auth");
      const token = await getAuthToken();
      const tempToken = token ? null : getTempAccessToken();
      const storedToken =
        token || tempToken ? null : getStoredSupabaseAccessToken();

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else if (tempToken) {
        config.headers.Authorization = `Bearer ${tempToken}`;
      } else if (storedToken) {
        config.headers.Authorization = `Bearer ${storedToken}`;
      }
    } catch (error) {
      // If token retrieval fails, continue without token (backend will handle auth)
      // This prevents blocking all requests when auth has issues
      console.warn("Failed to get auth token:", error);
    }

    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      const headers = config.headers;
      if (headers?.delete) {
        headers.delete("Content-Type");
      } else if (headers) {
        delete headers["Content-Type"];
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

let authFailureSignOut = null;

// Response interceptor: surface the server message, and drop a rejected session once.
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const serverMessage = messageFromApiError(error);
    if (error.response?.status === 413) {
      error.photoTooLarge = true;
    }
    if (serverMessage) {
      error.message = serverMessage;
    }
    if (isRejectedAuthToken(error) && !authFailureSignOut) {
      authFailureSignOut = import("../utils/auth")
        .then(({ signOutAll }) => signOutAll())
        .catch(() => {})
        .finally(() => {
          authFailureSignOut = null;
        });
    }
    return Promise.reject(error);
  },
);
