import { create } from "zustand";
import { API_ENDPOINTS, apiClient } from "../config/api";
import { supabase } from "../supabase/supabase";
import { getCurrentAuthUser } from "../utils/auth";
// import { commentProduct } from "../../../backend/controllers/product.controller";

const FEED_CACHE_TTL_MS = 15 * 60_000;

// change fetch URL in dev mode to http://localhost:5173/api/entrys
// Production URL is https://gym-tracker-brown.vercel.app/api/entrys/

const normalizePostForFeeds = (post) => ({
  ...post,
  _id: String(post._id),
  likes: Array.isArray(post.likes) ? post.likes : [],
  comments: Array.isArray(post.comments) ? post.comments : [],
  createdAt: post.createdAt || new Date().toISOString(),
  ownerId: post.ownerId || post.uid,
  trainerUid: post.trainerUid || null,
  trainerName: post.trainerName || null,
  trainerUsername: post.trainerUsername || null,
});

const upsertEntryInCache = (cache, entry, ownerUid) => {
  if (!cache || cache.uid !== ownerUid || cache.currentPage > 1 || cache.page > 1) {
    return cache;
  }

  const entries = Array.isArray(cache.entries) ? cache.entries : [];
  if (entries.some((item) => String(item._id) === String(entry._id))) {
    return cache;
  }

  const limit = cache.limit || cache.pagination?.limit || 6;
  const nextEntries = [entry, ...entries].slice(0, limit);
  const nextPagination = cache.pagination
    ? {
        ...cache.pagination,
        totalPosts: (cache.pagination.totalPosts || entries.length) + 1,
        totalPages: Math.max(
          1,
          Math.ceil(((cache.pagination.totalPosts || entries.length) + 1) / limit),
        ),
      }
    : cache.pagination;

  return {
    ...cache,
    entries: nextEntries,
    pagination: nextPagination,
    postsLoaded: cache.postsLoaded ?? true,
    cachedAt: Date.now(),
  };
};

const replaceEntryInCache = (cache, tempId, entry) => {
  if (!cache || !Array.isArray(cache.entries)) return cache;
  const entries = cache.entries.map((item) =>
    String(item._id) === String(tempId) ? entry : item,
  );
  return { ...cache, entries, cachedAt: Date.now() };
};

const removeEntryFromCache = (cache, id) => {
  if (!cache || !Array.isArray(cache.entries)) return cache;
  const entries = cache.entries.filter((item) => String(item._id) !== String(id));
  const limit = cache.limit || cache.pagination?.limit || 6;
  const nextPagination = cache.pagination
    ? {
        ...cache.pagination,
        totalPosts: Math.max(0, (cache.pagination.totalPosts || 0) - 1),
        totalPages: Math.max(
          1,
          Math.ceil(Math.max(0, (cache.pagination.totalPosts || 0) - 1) / limit),
        ),
      }
    : cache.pagination;
  return { ...cache, entries, pagination: nextPagination, cachedAt: Date.now() };
};

const buildOptimisticProfile = (state, entry, ownerUid) => {
  const currentInfo = state.currentUserInfo || {};
  const currentUser = state.currentUser || {};
  const snippet = entry.authorProfile || {};

  return {
    name:
      currentInfo.name ||
      currentUser.name ||
      (!snippet.isUsername ? snippet.displayName : "") ||
      "Name",
    username:
      currentInfo.username ||
      (snippet.isUsername ? snippet.displayName : "") ||
      currentInfo.name ||
      currentUser.name ||
      "Username",
    goal: currentInfo.goal || "Not set",
    gymName: currentInfo.gymName || "Not specified",
    postsCount: 1,
    profileImage:
      currentInfo.picture ||
      currentInfo.profileImage ||
      snippet.profileImage ||
      currentUser.picture ||
      "",
    backgroundPicture: currentInfo.backgroundPicture || "",
    bio: currentInfo.bio || "No bio available",
    followersCount: currentInfo.followersCount || 0,
    followingCount: currentInfo.followingCount || 0,
    uid: ownerUid,
  };
};

const seedHomeFeedCache = (entry, viewerUid) => ({
  uid: viewerUid,
  page: 1,
  limit: 6,
  entries: [entry],
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalPosts: 1,
    limit: 6,
  },
  cachedAt: Date.now(),
});

const seedProfileTabCache = (state, entry, ownerUid) => ({
  uid: ownerUid,
  currentPage: 1,
  limit: 6,
  entries: [entry],
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalPosts: 1,
    limit: 6,
  },
  userProfile: buildOptimisticProfile(state, entry, ownerUid),
  profileLoaded: true,
  postsLoaded: true,
  cachedAt: Date.now(),
});

const bumpProfilePostCount = (cache) => {
  if (!cache?.userProfile) return cache;
  return {
    ...cache,
    userProfile: {
      ...cache.userProfile,
      postsCount: (cache.userProfile.postsCount || 0) + 1,
    },
  };
};

const ENTRY_UPDATE_TIMEOUT_MS = 45_000;
const RETRYABLE_ENTRY_UPDATE_STATUS_CODES = new Set([408, 429, 502, 503, 504]);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableEntryUpdateError = (error) =>
  error?.code === "ECONNABORTED" ||
  error?.code === "ERR_NETWORK" ||
  !error?.response ||
  RETRYABLE_ENTRY_UPDATE_STATUS_CODES.has(error.response.status);

export const useProductStore = create((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  /** Set once HomePage finishes its first auth probe (native: lets RequireAuth skip a duplicate wait). */
  authBootstrapCompleteAt: null,
  setAuthBootstrapCompleteAt: (ts) => set({ authBootstrapCompleteAt: ts }),
  entrys: [],
  setEntrys: (entrys) => set({ entrys }),

  posts: [],
  setPosts: (posts) => set({ posts }),

  post: [],
  setPost: (post) => set({ post }),

  currentUserInfo: null,
  setCurrentUserInfo: (info) => set({ currentUserInfo: info }),

  // Claimed workouts state
  claimedWorkouts: [],
  setClaimedWorkouts: (workouts) => set({ claimedWorkouts: workouts }),
  showClaimedWorkoutsModal: false,
  setShowClaimedWorkoutsModal: (show) =>
    set({ showClaimedWorkoutsModal: show }),

  // Lightweight in-memory cache for tab state (prevents refetch/reload on tab switch)
  feedCacheTtlMs: FEED_CACHE_TTL_MS,
  homeFeedCache: null, // { uid, page, limit, entries, pagination, cachedAt }
  setHomeFeedCache: (cache) => set({ homeFeedCache: cache }),
  clearHomeFeedCache: () => set({ homeFeedCache: null }),

  profileTabCache: null, // { uid, currentPage, limit, entries, pagination, userProfile, followRequests, isAdmin, cachedAt }
  setProfileTabCache: (cache) => set({ profileTabCache: cache }),
  clearProfileTabCache: () => set({ profileTabCache: null }),

  analyticsTabCache: null, // { uid, timeframe, selectedExercise, analytics, personalRecords, userEntries, processedEntryIds, exerciseProgress, chartType, cachedAt }
  setAnalyticsTabCache: (cache) => set({ analyticsTabCache: cache }),
  clearAnalyticsTabCache: () => set({ analyticsTabCache: null }),

  notificationsCache: null, // { uid, items, cachedAt }
  setNotificationsCache: (cache) => set({ notificationsCache: cache }),
  clearNotificationsCache: () => set({ notificationsCache: null }),

  // write a createPosts with verifyIdToken
  createPost: async (newPost) => {
    const postPayload = { ...newPost };

    if (!postPayload.name || !postPayload.description) {
      return { success: false, message: "Please fill in all fields." };
    }

    if (postPayload.postImage) {
      postPayload.image = postPayload.postImage;
      if (postPayload.postImageName) {
        postPayload.imageName = postPayload.postImageName;
      }
    } else if (!postPayload.image) {
      delete postPayload.image;
      delete postPayload.imageName;
    }
    delete postPayload.postImage;
    delete postPayload.postImageName;

    try {
      const response = await apiClient.post(API_ENDPOINTS.CREATE_POST, postPayload);

      const data = response.data;
      const createdPost = normalizePostForFeeds(data.data);

      return {
        success: true,
        message: "Post created successfully",
        data: createdPost,
      };
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to create post");
    }
  },

  addOptimisticPost: (entry) => {
    const optimisticEntry = normalizePostForFeeds(entry);
    set((state) => {
      const ownerUid = optimisticEntry.ownerId || optimisticEntry.uid;
      const viewerUid =
        state.currentUser?.uid || state.currentUserInfo?.uid || ownerUid;
      const nextHomeCache =
        upsertEntryInCache(state.homeFeedCache, optimisticEntry, viewerUid) ||
        (viewerUid === ownerUid
          ? seedHomeFeedCache(optimisticEntry, viewerUid)
          : state.homeFeedCache);
      const upsertedProfileCache = upsertEntryInCache(
        state.profileTabCache,
        optimisticEntry,
        ownerUid,
      );
      const nextProfileCache =
        upsertedProfileCache && upsertedProfileCache !== state.profileTabCache
          ? bumpProfilePostCount(upsertedProfileCache)
          : upsertedProfileCache ||
            (viewerUid === ownerUid
              ? seedProfileTabCache(state, optimisticEntry, ownerUid)
              : state.profileTabCache);

      return {
        posts: [optimisticEntry, ...state.posts],
        homeFeedCache: nextHomeCache,
        profileTabCache: nextProfileCache,
      };
    });
  },

  replaceOptimisticPost: (tempId, serverEntry) => {
    const entry = normalizePostForFeeds(serverEntry);
    set((state) => ({
      posts: state.posts.map((item) =>
        String(item._id) === String(tempId) ? entry : item,
      ),
      homeFeedCache: replaceEntryInCache(state.homeFeedCache, tempId, entry),
      profileTabCache: replaceEntryInCache(state.profileTabCache, tempId, entry),
    }));
  },

  removeOptimisticPost: (tempId) => {
    set((state) => ({
      posts: state.posts.filter((item) => String(item._id) !== String(tempId)),
      homeFeedCache: removeEntryFromCache(state.homeFeedCache, tempId),
      profileTabCache: removeEntryFromCache(state.profileTabCache, tempId),
    }));
  },

  createEntry: async (newEntry) => {
    const entryPayload = { ...newEntry };

    if (!entryPayload.name || !entryPayload.description) {
      return { success: false, message: "Please fill in all fields." };
    }

    if (!entryPayload.image) {
      delete entryPayload.image;
      delete entryPayload.imageName;
    }

    try {
      const response = await apiClient.post(
        API_ENDPOINTS.CREATE_ENTRY,
        entryPayload
      );
      const data = response.data;
      set((state) => ({ entrys: [...state.entrys, data.data] }));
      return { success: true, message: "Entry created successfully" };
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to create entry");
    }
  },

  deleteEntry: async (pid) => {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.DELETE_ENTRY(pid));
      const data = response.data;

      if (!data.success) return { success: false, message: data.message };

      set((state) => ({
        entrys: state.entrys.filter(
          (entry) => String(entry._id) !== String(pid)
        ),
      }));
      return { success: true, message: data.message };
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to delete entry");
    }
  },

  updateBackgroundProfile: async (newBackgroundProfile) => {
    const formData = new FormData();
    formData.append("backgroundPicture", newBackgroundProfile);

    try {
      const response = await apiClient.post(
        API_ENDPOINTS.UPDATE_USER_BACKGROUND,
        formData
      );

      const data = response.data;

      return { success: true, message: data.message };
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to update background profile"
      );
    }
  },

  updateEntry: async (pid, updatedEntry) => {
    try {
      const url = API_ENDPOINTS.UPDATE_ENTRY(pid);
      const requestConfig = { timeout: ENTRY_UPDATE_TIMEOUT_MS };
      let response;

      try {
        response = await apiClient.put(url, updatedEntry, requestConfig);
      } catch (error) {
        if (!isRetryableEntryUpdateError(error)) {
          throw error;
        }

        // The first request after a long idle can wake a cold backend/DB connection.
        await wait(750);
        response = await apiClient.put(url, updatedEntry, requestConfig);
      }

      const data = response.data;

      if (!data.success) return { success: false, message: data.message };

      set((state) => ({
        entrys: state.entrys.map((entry) =>
          entry._id === pid ? { ...entry, ...data.data } : entry
        ),
      }));
      return { success: true, message: data.message, data: data.data };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        (error.code === "ECONNABORTED"
          ? "Save timed out. Please check your connection and try again."
          : error.message) ||
        "Failed to update entry";
      throw new Error(message);
    }
  },

  /** Text-only backup while editing (owner); complements device localStorage. */
  saveEntryDraft: async (pid, { name, description }) => {
    try {
      const response = await apiClient.put(API_ENDPOINTS.ENTRY_EDIT_DRAFT(pid), {
        name,
        description,
      });
      return {
        success: response.data?.success === true,
        message: response.data?.message,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message,
      };
    }
  },

  getEntryDraft: async (pid) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ENTRY_EDIT_DRAFT(pid));
      const data = response.data;
      if (!data?.success) {
        return { success: false, message: data?.message, data: null };
      }
      return { success: true, data: data.data };
    } catch (error) {
      return {
        success: false,
        data: null,
        message:
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message,
      };
    }
  },

  deleteEntryDraft: async (pid) => {
    try {
      const response = await apiClient.delete(
        API_ENDPOINTS.ENTRY_EDIT_DRAFT(pid)
      );
      return { success: response.data?.success === true };
    } catch (error) {
      return { success: false };
    }
  },

  likeEntry: async (pid) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.LIKE_ENTRY(pid));
      const data = response.data;

      if (!data.success) return { success: false, message: data.message };

      set((state) => ({
        entrys: state.entrys.map((entry) =>
          entry._id === pid ? { ...entry, likes: data.likes } : entry
        ),
      }));
      return {
        success: true,
        message: data.message,
        liked: data.liked,
        likes: data.likes, // now an array of user objects
      };
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to like entry");
    }
  },

  commentEntry: async (pid, comment) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.COMMENT_ENTRY(pid), {
        comment,
      });
      const data = response.data;

      if (!data.success) return { success: false, message: data.message };

      set((state) => ({
        entrys: state.entrys.map((entry) =>
          entry._id === pid ? { ...entry, comments: data.comments } : entry
        ),
      }));
      return { success: true, message: data.message, comments: data.comments };
    } catch (error) {
      const message =
        error.response?.data?.error ||
        (error.code === "ERR_NETWORK"
          ? "Cannot reach the API server. Start the backend or set VITE_API_BASE_URL."
          : error.message) ||
        "Failed to comment on entry";
      throw new Error(message);
    }
  },

  uploadProfilePic: async (profilePic) => {
    const formData = new FormData();
    formData.append("profileImage", profilePic);

    try {
      const response = await apiClient.post(
        API_ENDPOINTS.UPLOAD_PROFILE_PIC,
        formData
      );

      const data = response.data;

      return {
        success: true,
        message: data.message,
        url: data.url,
      };
    } catch (error) {
      throw new Error(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to upload profile picture"
      );
    }
  },

  clearEntrys: () => set({ entrys: [] }),

  // handle upload image
  handleFileUpload: async (file) => {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("profileImage", file);
      // Send to backend
      const res = await apiClient.post(API_ENDPOINTS.UPLOAD_PROFILE_PIC, formData);
      if (!res.data?.success && res.data?.error) {
        throw new Error(res.data.error || "Failed to upload profile picture");
      }

      // Update UI with new image URL
      // setProfilePictureUrl(res.data.url); // This line was removed as per the edit hint
    } catch (error) {
      // Upload failed
    }
  },
}));

const runAuthBootstrap = async (session) => {
  if (session?.user) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.GET_CURRENT_USER);
      if (response.data) {
        useProductStore.getState().setCurrentUserInfo(response.data);
      }

      try {
        const createUserResponse = await apiClient.get(
          API_ENDPOINTS.GET_CURRENT_MONGODB_USER
        );

        if (
          createUserResponse.data &&
          (createUserResponse.data.data || createUserResponse.data) &&
          (createUserResponse.data.data?.claimedWorkouts > 0 ||
            createUserResponse.data.claimedWorkouts > 0)
        ) {
          const userData =
            createUserResponse.data.data || createUserResponse.data;
          if (userData.workouts) {
            useProductStore.getState().setClaimedWorkouts(userData.workouts);

            if (userData.isNewUser) {
              useProductStore.getState().setShowClaimedWorkoutsModal(true);
            }
          }
        }
      } catch (claimError) {
        // Silently handle errors - user might not have claimed workouts
      }
    } catch (e) {
      const fallbackInfo = await getCurrentAuthUser();
      useProductStore.getState().setCurrentUserInfo(fallbackInfo || null);
    }
  } else {
    useProductStore.getState().setCurrentUserInfo(null);
    useProductStore.getState().setClaimedWorkouts([]);
    useProductStore.getState().setShowClaimedWorkoutsModal(false);
  }
};

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT" || !session?.user) {
    runAuthBootstrap(null);
    return;
  }
  runAuthBootstrap(session);
});

// Add sharing functionality to the store
export const useSharingStore = create((set) => ({
  // Share a workout and get a shareable link
  shareWorkout: async (entryId) => {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.SHARE_WORKOUT(entryId)
      );
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to share workout",
      };
    }
  },

  // Get a shared workout by token
  getSharedWorkout: async (shareToken) => {
    try {
      const response = await apiClient.get(
        API_ENDPOINTS.GET_SHARED_WORKOUT(shareToken)
      );
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to load shared workout",
      };
    }
  },

  // Save a shared workout to user's account
  saveSharedWorkout: async (shareToken) => {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.SAVE_SHARED_WORKOUT(shareToken)
      );
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to save workout",
      };
    }
  },
}));
