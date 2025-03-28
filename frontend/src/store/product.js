import { create } from "zustand";
import { auth } from "../firebase";
import { getAuth, signInWithPopup } from "firebase/auth";
// import { commentProduct } from "../../../backend/controllers/product.controller";

// change fetch URL in dev mode to http://localhost:5173/api/entrys
// Production URL is https://gym-tracker-brown.vercel.app/api/entrys/

export const useProductStore = create((set) => ({
  entrys: [],
  setEntrys: (entrys) => set({ entrys }),

  posts: [],
  setPosts: (posts) => set({ posts }),

  post: [],
  setPost: (post) => set({ post }),

  // write a createPosts with verifyIdToken
  createPost: async (newPost) => {
    // console.log("New Post:", newPost);
    const token = await auth.currentUser.getIdToken();
    if (!newPost.name || !newPost.description) {
      return { success: false, message: "Please fill in all fields." };
    }

    if (!newPost.image) {
      newPost.image =
        "https://coffective.com/wp-content/uploads/2018/06/default-featured-image.png.jpg";
    }

    const res = await fetch("https://gym-tracker-brown.vercel.app/api/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(newPost),
    });
    if (!res.ok) {
      const errorData = await res.json();
      // console.error("Error creating post:", errorData);
      throw new Error(errorData.error || "Failed to create post");
    }
    // console.log("New Post:", newPost);
    // console.log("Response:", res);
    const data = await res.json();
    set((state) => ({ posts: [...state.posts, data.data] }));
    // console.log("New Post:", newPost);
    return { success: true, message: "Post created successfully" };
  },

  createEntry: async (newEntry) => {
    if (!newEntry.name || !newEntry.description) {
      return { success: false, message: "Please fill in all fields." };
    }

    if (!newEntry.image) {
      newEntry.image =
        "https://coffective.com/wp-content/uploads/2018/06/default-featured-image.png.jpg";
    }

    const res = await fetch("https://gym-tracker-brown.vercel.app/api/entrys", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newEntry),
    });
    const data = await res.json();
    set((state) => ({ entrys: [...state.entrys, data.data] }));
    return { success: true, message: "Entry created successfully" };
  },

  deleteEntry: async (pid) => {
    const res = await fetch(
      `https://gym-tracker-brown.vercel.app/api/entrys/${pid}`,
      {
        method: "DELETE",
      }
    );
    const data = await res.json();
    if (!data.success) return { success: false, message: data.message };

    set((state) => ({
      entrys: state.entrys.filter((entry) => entry._id !== pid),
    }));
    return { success: true, message: data.message };
  },

  updateBackgroundProfile: async (newBackgroundProfile) => {
    const auth = getAuth();
    const user = auth.currentUser;
    const token = await user.getIdToken();
    const formData = new FormData();
    formData.append("backgroundProfile", newBackgroundProfile);

    const res = await fetch(
      `https://locahost:5001/api/upload/updateUserBackgroundPicture`,
      // `https://gym-tracker-brown.vercel.app/api/upload/uploadBackgroundProfile`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    const data = await res.json();
    console.log("Response:", data);

    if (!res.ok) {
      throw new Error(data.message || "Failed to update background profile");
    }

    return { success: true, message: data.message };
  }

  // Update workout entry
  updateEntry: async (pid, updatedEntry) => {
    const auth = getAuth();
    const user = auth.currentUser;
    const token = await user.getIdToken();
    const formData = new FormData();

    Object.entries(updatedEntry).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        formData.append(key, value);
        console.log("key:", key, "value:", value);
      }
    });

    formData.append("pid", pid);
    console.log("formData:", ...formData);
    const res = await fetch(
      `https://gym-tracker-brown.vercel.app/api/entrys/${pid}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    const data = await res.json();
    console.log("Response:", data);

    if (!res.ok) {
      throw new Error(data.message || "Failed to update entry");
    }

    set((state) => ({
      entrys: state.entrys.map((entry) =>
        entry._id === pid ? data.data : entry
      ),
    }));

    return { success: true, message: data.message };
  },

  // Like a product
  likeEntry: async (pid) => {
    const res = await fetch(
      `https://gym-tracker-brown.vercel.app/api/entrys/${pid}/like`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    const data = await res.json();
    if (!data.success) return { success: false, message: data.message };
    // Updates the 'like' UI immediately without needing to fetch all products again or a refresh
    set((state) => ({
      entrys: state.entrys.map((entry) =>
        entry._id === pid ? { ...entry, likes: entry.likes + 1 } : entry
      ),
    }));

    return { success: true, message: "Entry Liked!" };
  },

  commentEntry: async (pid, comment) => {
    const res = await fetch(
      `https://gym-tracker-brown.vercel.app/api/entrys/${pid}/comment`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ comment }),
      }
    );
    const data = await res.json();
    if (!data.success) return { success: false, message: data.message };
    // Updates the 'comment' UI immediately without needing to fetch all products again or a refresh
    set((state) => ({
      entrys: state.entrys.map((entry) =>
        entry._id === pid ? data.data : entry
      ),
    }));

    return { success: true, message: "Comment added!" };
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
      // console.log("executing code from Product.js (uploadProfilePic)");
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
      setProfilePictureUrl(res.data.url);
    } catch (error) {
      console.error("Upload failed", error);
    }
  },
}));

// Add an authentication state listener to ensure the user is authenticated
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log("User authenticated:", user);
    // Call fetchEntrys function here if needed
  } else {
    // console.error("User not authenticated");
  }
});
