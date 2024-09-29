import { create } from "zustand";
// import { commentProduct } from "../../../backend/controllers/product.controller";

export const useProductStore = create((set) => ({
  entrys: [],
  setEntrys: (entrys) => set({ entrys }),
  createEntry: async (newEntry) => {
    if (!newEntry.name || !newEntry.price) {
      return { success: false, message: "Please fill in all fields." };
    }

    if (!newEntry.image) {
      newEntry.image =
        "https://coffective.com/wp-content/uploads/2018/06/default-featured-image.png.jpg";
    }

    const res = await fetch("/api/entrys", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newEntry),
    });
    const data = await res.json();
    set((state) => ({ entrys: [...state.entrys, data.data] }));
    return { success: true, message: "Product created successfully" };
  },
  fetchEntrys: async () => {
    const res = await fetch("/api/entrys");
    const data = await res.json();
    set({ entrys: data.data });
  },
  deleteEntry: async (pid) => {
    const res = await fetch(`/api/entrys/${pid}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!data.success) return { success: false, message: data.message };

    set((state) => ({
      entrys: state.entrys.filter((entry) => entry._id !== pid),
    }));
    return { success: true, message: data.message };
  },
  updateEntry: async (pid, updatedEntry) => {
    const res = await fetch(`/api/entrys/${pid}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedEntry),
    });
    const data = await res.json();
    if (!data.success) return { success: false, message: data.message };
    // UPdates the UI immediately without needing to fetch all products again or a refresh
    set((state) => ({
      entrys: state.entrys.map((entry) =>
        entry._id === pid ? data.data : entry
      ),
    }));

    return { success: true, message: data.message };
  },

  // Like a product
  likeEntry: async (pid) => {
    const res = await fetch(`/api/entrys/${pid}/like`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
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
    const res = await fetch(`/api/entrys/${pid}/comment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ comment }),
    });
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
}));
