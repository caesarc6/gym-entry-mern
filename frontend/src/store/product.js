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

  // updateProfile
  // updateEntry: async (pid, updatedEntry) => {
  //   const auth = getAuth();
  //   const user = auth.currentUser;
  //   const token = await user.getIdToken();

  //   console.log("Sending data:", updatedEntry); // Debug log

  //   try {
  //     const res = await fetch(`http://localhost:5001/api/entrys/${pid}`, {
  //       method: "PUT",
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //         "Content-Type": "application/json", // Important!
  //       },
  //       body: JSON.stringify(updatedEntry), // Send directly as JSON
  //     });

  //     const data = await res.json();

  //     if (!res.ok) {
  //       throw new Error(data.message || "Failed to update entry");
  //     }

  //     if (!data.success) return { success: false, message: data.message };

  //     set((state) => ({
  //       entrys: state.entrys.map((entry) =>
  //         entry._id === pid ? data.data : entry
  //       ),
  //     }));

  //     return { success: true, message: data.message };
  //   } catch (error) {
  //     console.error("Error:", error);
  //     throw error;
  //   }
  // },

  // updateProfile: async (updatedProfile, token) => {
  //   // const token = await auth.currentUser.getIdToken();
  //   const res = await fetch(`http://localhost:5001/api/updateUserProfile`, {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "multipart/form-data",
  //       Authorization: `Bearer ${token}`,
  //     },
  //     body: JSON.stringify(updatedProfile),
  //   });
  //   const data = await res.json();
  //   console.log("Data:", data);
  //   if (!data.success) return { success: false, message: data.message };
  //   console.log("Data:", data);
  //   console.log("error message:", data.message);
  //   set({ user: data.data });
  //   return { success: true, message: data.message };
  // },

  // updateProfile: async (formData, token) => {
  //   try {
  //     const response = await axios.post(
  //       "http://localhost:5001/api/updateUserProfile",
  //       formData,
  //       {
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //           "Content-Type": "multipart/form-data",
  //         },
  //       }
  //     );

  //     const data = await response.data;
  //     setUserProfile(data);
  //     console.log("Profile updated successfully:", data);
  //   } catch (error) {
  //     console.error("Error updating profile:", error);
  //   }
  // },

  // write a createPosts with verifyIdToken
  createPost: async (newPost) => {
    console.log("New Post:", newPost);
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
      console.error("Error creating post:", errorData);
      throw new Error(errorData.error || "Failed to create post");
    }
    console.log("New Post:", newPost);
    console.log("Response:", res);
    const data = await res.json();
    set((state) => ({ posts: [...state.posts, data.data] }));
    console.log("New Post:", newPost);
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

  // fetchEntrys: async () => {
  //   try {
  //     const user = auth.currentUser;
  //     if (!user) {
  //       throw new Error("User not authenticated");
  //     }

  //     const token = await auth.currentUser.getIdToken();
  //     const uid = user.uid;

  //     const res = await fetch(`http://localhost:5001/api/posts/${uid}`, {
  //       method: "GET",
  //       // headers: {
  //       //   "Content-Type": "application/json",
  //       //   Authorization: `Bearer ${token}`,
  //       // },
  //     });

  //     if (!res.ok) {
  //       throw new Error(`Error: ${res.status} ${res.statusText}`);
  //     }

  //     const data = await res.json();
  //     console.log("Data:", data);
  //     set({ entrys: data.data });
  //   } catch (error) {
  //     console.error("Failed to fetch entries:", error);
  //   }
  // },

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

  updateEntry: async (pid, updatedEntry) => {
    const auth = getAuth();
    const user = auth.currentUser;
    const token = await user.getIdToken();
    const formData = new FormData();

    // console.log("sending data as FormData:", updatedEntry);

    if (!updatedEntry || typeof updatedEntry !== "object") {
      throw new Error("Invalid updatedEntry data");
    }
    // Object.entries(updatedEntry).forEach(([key, value]) => {
    //   if (value != null && value !== "") {
    //     formData.append(key, value);
    //   }
    // });
    Object.entries(updatedEntry).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        formData.append(key, value);
      }
    });

    formData.append("pid", pid);

    // Log FormData to verify its contents
    // for (let [key, value] of formData.entries()) {
    //   console.log(key, value);
    // }
    // `https://gym-tracker-brown.vercel.app/api/entrys/${pid}`,

    const res = await fetch(
      `https://gym-tracker-brown.vercel.app/api/entrys/${pid}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
        // body: JSON.stringify(entryData),
      }
    );

    const data = await res.json();
    console.log("Response:", data);

    if (!res.ok) {
      throw new Error(data.message || "Failed to update entry");
    }
    // const data = await res.json();
    if (!data.success) return { success: false, message: data.message };
    // Updates the UI immediately without needing to fetch all products again or a refresh
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
        console.error("Error creating post:", errorData);
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
    console.error("User not authenticated");
  }
});
