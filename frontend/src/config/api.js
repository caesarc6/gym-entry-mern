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
        const token = await auth.currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.error("Error getting auth token:", error);
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error("API Error:", {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url,
    });
    return Promise.reject(error);
  }
);
