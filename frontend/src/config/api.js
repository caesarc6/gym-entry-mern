// API Configuration
const getApiBaseUrl = () => {
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
  GET_USER_PROFILE: (uid) => buildApiUrl(`getUserProfile/${uid}`),
  UPDATE_USER_PROFILE: buildApiUrl("updateUserProfile"),
  UPDATE_USER_BACKGROUND: buildApiUrl("updateUserBackgroundPicture"),
  GET_CURRENT_MONGODB_USER: buildApiUrl("getCurrentMongoDBUser"),

  // Profile image endpoints
  PROFILE_IMAGE: (uid) => buildApiUrl(`profile-image/${uid}`),
  BATCH_PROFILE_IMAGES: buildApiUrl("batch-profile-images"),
  UPLOAD_PROFILE_PIC: buildApiUrl("upload/uploadProfilePic"),

  // Posts/Entries endpoints
  POSTS: (uid, page = 1, limit = 10) =>
    buildApiUrl(`posts/${uid}?page=${page}&limit=${limit}`),
  CREATE_POST: buildApiUrl("posts"),
  CREATE_ENTRY: buildApiUrl("entrys"),
  DELETE_ENTRY: (id) => buildApiUrl(`entrys/${id}`),
  UPDATE_ENTRY: (id) => buildApiUrl(`entrys/${id}`),
  LIKE_ENTRY: (id) => buildApiUrl(`entrys/${id}/like`),
  COMMENT_ENTRY: (id) => buildApiUrl(`entrys/${id}/comment`),
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

  // Trainer dashboard access endpoints
  REQUEST_TRAINER_DASHBOARD_ACCESS: buildApiUrl("trainer-dashboard/request"),
  CHECK_TRAINER_DASHBOARD_ACCESS: buildApiUrl("trainer-dashboard/access"),

  // Admin endpoints
  CHECK_IS_ADMIN: buildApiUrl("admin/check"),
  GET_TRAINER_DASHBOARD_REQUESTS: buildApiUrl(
    "admin/trainer-dashboard-requests"
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
        exercise
      )}&timeframe=${timeframe}`
    ),
  PERSONAL_RECORDS: buildApiUrl("workouts/prs"),
  REPROCESS_ALL_WORKOUTS: buildApiUrl("workouts/reprocess-all"),
  REPROCESS_ALL_WORKOUTS_WITH_GYM_NORMALIZATION: buildApiUrl(
    "workouts/reprocess-all-with-gym-normalization"
  ),
  COMPLETELY_REPROCESS_ALL_WORKOUTS: buildApiUrl(
    "workouts/completely-reprocess-all"
  ),

  // Workout sharing endpoints
  SHARE_WORKOUT: (entryId) => buildApiUrl(`entrys/${entryId}/share`),
  GET_SHARED_WORKOUT: (shareToken) =>
    buildApiUrl(`entrys/shared/${shareToken}`),
  SAVE_SHARED_WORKOUT: (shareToken) =>
    buildApiUrl(`entrys/shared/${shareToken}/save`),

  // Shared Workout endpoints
  CREATE_SHARED_WORKOUT: buildApiUrl("shared-workouts"),
  GET_TRAINER_SHARED_WORKOUTS: buildApiUrl("shared-workouts/trainer"),
  GET_SHARED_WORKOUT: (sharedWorkoutId) =>
    buildApiUrl(`shared-workouts/${sharedWorkoutId}`),
  UPDATE_SHARED_WORKOUT: (sharedWorkoutId) =>
    buildApiUrl(`shared-workouts/${sharedWorkoutId}`),
  DELETE_SHARED_WORKOUT: (sharedWorkoutId) =>
    buildApiUrl(`shared-workouts/${sharedWorkoutId}`),

  // Sharing endpoints
  SHARE_WORKOUT_TO_USER: (sharedWorkoutId) =>
    buildApiUrl(`shared-workouts/${sharedWorkoutId}/share`),
  GET_TRAINER_ASSIGNMENTS: buildApiUrl("shared-workouts/assignments/trainer"),
  GET_USER_ASSIGNMENTS: buildApiUrl("shared-workouts/assignments/user"),
  GET_TRAINER_CLIENTS: buildApiUrl("shared-workouts/clients"),
  UPDATE_WORKOUT_ASSIGNMENT: (assignmentId) =>
    buildApiUrl(`shared-workouts/assignments/${assignmentId}`),
  MARK_WORKOUT_AS_SAVED: (assignmentId) =>
    buildApiUrl(`shared-workouts/assignments/${assignmentId}/save`),
  CONTINUE_ASSIGNED_WORKOUT: (assignmentId) =>
    buildApiUrl(`shared-workouts/assignments/${assignmentId}/continue`),
  COMPLETE_ASSIGNED_WORKOUT: (assignmentId) =>
    buildApiUrl(`shared-workouts/assignments/${assignmentId}/complete`),

  // Workout claiming endpoints
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
    "shared-workouts/generate-client-link"
  ),
  GET_CLIENT_WORKOUTS_BY_TOKEN: (shareToken) =>
    buildApiUrl(`shared-workouts/client-claim/${shareToken}`),
  CLAIM_CLIENT_WORKOUTS_BY_TOKEN: (shareToken) =>
    buildApiUrl(`shared-workouts/client-claim/${shareToken}/claim`),
};

// Axios instance with default configuration
import axios from "axios";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout to 30 seconds
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    // Import auth dynamically to avoid circular dependencies
    const { auth } = await import("../firebase");

    if (auth.currentUser) {
      try {
        // Try to get token without forcing refresh first (uses cached token if available)
        let token;
        try {
          token = await auth.currentUser.getIdToken(false);
        } catch (error) {
          // If cached token fails, try with refresh
          try {
            token = await auth.currentUser.getIdToken(true);
          } catch (refreshError) {
            console.error(
              "❌ Failed to refresh token:",
              refreshError.code,
              refreshError.message
            );
            throw refreshError;
          }
        }

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error(
          "❌ Error getting auth token:",
          error.code,
          error.message
        );
        // If token refresh fails, try to continue without token (backend will handle auth)
        // This prevents blocking all requests when Firebase has issues
        if (
          error.code === "auth/user-token-expired" ||
          error.code === "auth/user-disabled"
        ) {
          console.error("User token expired or disabled, redirecting to login");
          // You might want to redirect to login page here
        }
      }
    }

    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor to log backend error messages
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Log detailed error information from backend
    if (error.response) {
      console.error("❌ Backend Error Response:", {
        status: error.response.status,
        statusText: error.response.statusText,
        url: error.config?.url,
        message: error.response.data?.message,
        code: error.response.data?.code,
        fullError: error.response.data,
      });
    } else {
      console.error("❌ Network Error:", error.message);
    }
    return Promise.reject(error);
  }
);
