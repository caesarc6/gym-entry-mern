import { create } from "zustand";
import { API_ENDPOINTS, apiClient } from "../config/api";
import { supabase } from "../supabase/supabase";
import { getCurrentAuthUser } from "../utils/auth";
// import { commentProduct } from "../../../backend/controllers/product.controller";

// change fetch URL in dev mode to http://localhost:5173/api/entrys
// Production URL is https://gym-tracker-brown.vercel.app/api/entrys/

export const useProductStore = create((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
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

  // write a createPosts with verifyIdToken
  createPost: async (newPost) => {
    if (!newPost.name || !newPost.description) {
      return { success: false, message: "Please fill in all fields." };
    }

    // Handle image data - check if we have postImage (base64) or use default
    if (!newPost.image && !newPost.postImage) {
      newPost.image =
        "https://coffective.com/wp-content/uploads/2018/06/default-featured-image.png.jpg";
    } else if (newPost.postImage) {
      newPost.image = newPost.postImage;
      // Also set imageName if available
      if (newPost.postImageName) {
        newPost.imageName = newPost.postImageName;
      }
    }

    try {
      const response = await apiClient.post(API_ENDPOINTS.CREATE_POST, newPost);

      const data = response.data;

      set((state) => ({ posts: [...state.posts, data.data] }));
      return { success: true, message: "Post created successfully" };
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to create post");
    }
  },

  createEntry: async (newEntry) => {
    if (!newEntry.name || !newEntry.description) {
      return { success: false, message: "Please fill in all fields." };
    }

    if (!newEntry.image) {
      newEntry.image =
        "https://coffective.com/wp-content/uploads/2018/06/default-featured-image.png.jpg";
    }

    try {
      const response = await apiClient.post(
        API_ENDPOINTS.CREATE_ENTRY,
        newEntry
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
        entrys: state.entrys.filter((entry) => entry._id !== pid),
      }));
      return { success: true, message: data.message };
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to delete entry");
    }
  },

  updateBackgroundProfile: async (newBackgroundProfile) => {
    const formData = new FormData();
    formData.append("backgroundProfile", newBackgroundProfile);

    try {
      const response = await apiClient.post(
        API_ENDPOINTS.UPDATE_USER_BACKGROUND,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
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
      const response = await apiClient.put(
        API_ENDPOINTS.UPDATE_ENTRY(pid),
        updatedEntry
      );
      const data = response.data;

      if (!data.success) return { success: false, message: data.message };

      set((state) => ({
        entrys: state.entrys.map((entry) =>
          entry._id === pid ? { ...entry, ...data.data } : entry
        ),
      }));
      return { success: true, message: data.message, data: data.data };
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to update entry");
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
      return { success: true, message: data.message };
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
    formData.append("profilePic", profilePic);

    try {
      const response = await apiClient.post(
        API_ENDPOINTS.UPLOAD_PROFILE_PIC,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const data = response.data;

      return { success: true, message: data.message };
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to upload profile picture"
      );
    }
  },

  clearEntrys: () => set({ entrys: [] }),

  // handle upload image
  handleFileUpload: async (file) => {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("profilePicture", file);
      // Send to backend
      const res = await apiClient.post(API_ENDPOINTS.UPLOAD_PROFILE_PIC, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
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

// Debounce: Supabase can emit several events at startup; avoids duplicate API bursts.
let authBootstrapTimer = null;
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
    if (authBootstrapTimer) {
      clearTimeout(authBootstrapTimer);
      authBootstrapTimer = null;
    }
    runAuthBootstrap(null);
    return;
  }
  if (authBootstrapTimer) {
    clearTimeout(authBootstrapTimer);
  }
  const snap = session;
  authBootstrapTimer = setTimeout(() => {
    authBootstrapTimer = null;
    runAuthBootstrap(snap);
  }, 120);
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
