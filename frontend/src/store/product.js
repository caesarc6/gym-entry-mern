import { create } from "zustand";
import { auth } from "../firebase";
import { getAuth, signInWithPopup } from "firebase/auth";
import { API_ENDPOINTS, apiClient } from "../config/api";
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

  // write a createPosts with verifyIdToken
  createPost: async (newPost) => {
    const token = await auth.currentUser.getIdToken();
    if (!newPost.name || !newPost.description) {
      return { success: false, message: "Please fill in all fields." };
    }

    if (!newPost.image) {
      newPost.image =
        "https://coffective.com/wp-content/uploads/2018/06/default-featured-image.png.jpg";
    }

    try {
      const response = await apiClient.post(API_ENDPOINTS.CREATE_POST, newPost);
      const data = response.data;
      set((state) => ({ posts: [...state.posts, data.data] }));
      return { success: true, message: "Post created successfully" };
    } catch (error) {
      console.error("Error creating post:", error);
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
      console.error("Error creating entry:", error);
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
      console.error("Error deleting entry:", error);
      throw new Error(error.response?.data?.error || "Failed to delete entry");
    }
  },

  updateBackgroundProfile: async (newBackgroundProfile) => {
    const auth = getAuth();
    const user = auth.currentUser;
    const token = await user.getIdToken();
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
      console.error("Error updating background profile:", error);
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
      console.error("Error updating entry:", error);
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
      console.error("Error liking entry:", error);
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
      console.error("Error commenting on entry:", error);
      throw new Error(
        error.response?.data?.error || "Failed to comment on entry"
      );
    }
  },

  uploadProfilePic: async (profilePic) => {
    const auth = getAuth();
    const user = auth.currentUser;
    const token = await user.getIdToken();
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
      console.error("Error uploading profile picture:", error);
      throw new Error(
        error.response?.data?.message || "Failed to upload profile picture"
      );
    }
  },

  clearEntrys: () => set({ entrys: [] }),

  // handle upload image
  handleFileUpload: async (file) => {
    try {
      // Get Firebase auth token
      const token = await auth.currentUser.getIdToken();

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("profilePicture", file);
      // Send to backend
      const res = await fetch(
        "https://gym-tracker-brown.vercel.app/api/upload/uploadProfilePic",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          body: formData,
        }
      );
      if (!res.ok) {
        const errorData = await res.json();
        // console.error("Error creating post:", errorData);
        throw new Error(errorData.error || "Failed to create post");
      }

      // Update UI with new image URL
      // setProfilePictureUrl(res.data.url); // This line was removed as per the edit hint
    } catch (error) {
      console.error("Upload failed", error);
    }
  },
}));

// Add an authentication state listener to ensure the user is authenticated
auth.onAuthStateChanged(async (user) => {
  if (user) {
    // Fetch full user info from backend
    try {
      const response = await apiClient.get(API_ENDPOINTS.GET_CURRENT_USER);
      if (response.data) {
        useProductStore.getState().setCurrentUserInfo(response.data);
      }
    } catch (e) {
      console.error("Error fetching current user info:", e); // Debug log
      // fallback: just store Firebase info
      const fallbackInfo = {
        uid: user.uid,
        name: user.displayName || "User",
        username: user.displayName || "user",
        picture: user.photoURL || "",
      };
      useProductStore.getState().setCurrentUserInfo(fallbackInfo);
    }
  } else {
    useProductStore.getState().setCurrentUserInfo(null);
  }
});
