import { User, Post, Comment } from "../models/user.model.js";
import Entry from "../models/entry.model.js";
import { supabase } from "../supabase/supabase.js";
import multer from "multer";
import path from "path";

// Multer configuration
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"), false);
  }
};

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB file size limit
    fieldSize: 20 * 1024 * 1024, // 20MB field size limit
  },
});

// Middleware to handle file upload errors
export const handleFileUpload = (req, res, next) => {
  upload.single("profileImage")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          message: "File too large. Please upload a smaller image (max 20MB).",
        });
      }
    } else if (err) {
      return res.status(400).json({
        error: err.message,
      });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    next();
  });
};

// Update user privacy settings
export const updateUserPrivacy = async (req, res) => {
  try {
    const { isPrivate, showEmail, showEntries } = req.body;

    // Validate input
    if (
      isPrivate === undefined &&
      showEmail === undefined &&
      showEntries === undefined
    ) {
      return res.status(400).json({ message: "No privacy settings provided" });
    }

    // Update only the provided fields
    const updateFields = {};
    if (isPrivate !== undefined) updateFields["privacy.isPrivate"] = isPrivate;
    if (showEmail !== undefined) updateFields["privacy.showEmail"] = showEmail;
    if (showEntries !== undefined)
      updateFields["privacy.showEntries"] = showEntries;

    const updatedUser = await User.findOneAndUpdate(
      { uid: req.user.uid },
      { $set: updateFields },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Privacy settings updated successfully",
      privacy: updatedUser.privacy,
    });
  } catch (error) {
    console.error("Error updating privacy settings:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get user profile by username (for public viewing)
export const getUserProfileByUsername = async (req, res) => {
  try {
    const { username } = req.params;

    // Get the requesting user (if authenticated)
    let viewerUser = null;
    if (req.user && req.user.uid) {
      viewerUser = await User.findOne({ uid: req.user.uid });
    }

    // Find the requested user profile
    const user = await User.findOne({ username }).populate(
      "followers following"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Filter user data based on privacy settings
    const { filterUserDataForPublicView, filterEntriesForPublicView } =
      await import("../utils/userUtils.js");
    const filteredUserData = filterUserDataForPublicView(user, viewerUser);

    // Get user entries if appropriate
    let entries = [];
    if (
      !user.privacy.isPrivate ||
      (viewerUser &&
        user.followers.some(
          (f) => f._id.toString() === viewerUser._id.toString()
        )) ||
      (viewerUser && viewerUser._id.toString() === user._id.toString())
    ) {
      entries = await Entry.find({ uid: user.uid });
      entries = filterEntriesForPublicView(entries, user, viewerUser);
    }

    return res.status(200).json({
      user: filteredUserData,
      entries: entries,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Check if a user is following another user
export const checkFollowing = async (req, res) => {
  try {
    const { targetUserId } = req.params;

    const user = await User.findOne({ uid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isFollowing = user.following.some(
      (id) => id.toString() === targetUserId
    );

    return res.status(200).json({ isFollowing });
  } catch (error) {
    console.error("Error checking follow status:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Existing controller functions (abridged for brevity)
export const getCurrentMongoDBUser = async (req, res) => {
  const { uid } = req.user;

  try {
    const user = await User.findOne({ uid });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve user" });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const { uid } = req.user;
    const { name, goal, gymName, bio, profileImageName, profileImage } =
      req.body;

    if (!name && !goal && !gymName && !bio && !profileImage) {
      return res.status(400).json({
        success: false,
        message: "No data provided for update",
      });
    }

    let profileImageUrl = null;
    if (profileImageName && profileImageName !== "undefined") {
      try {
        const base64Data = profileImage.split(";base64,").pop();
        const imageBuffer = Buffer.from(base64Data, "base64");
        const timestamp = Date.now();
        const filePath = `profiles/profile_${uid}/${profileImageName}_${timestamp}.jpg`;

        const { error } = await supabase.storage
          .from("user_profiles")
          .upload(filePath, imageBuffer, {
            contentType: "image/jpeg",
            cacheControl: "3600",
            upsert: true,
          });

        if (error) {
          console.error("Supabase upload error details:", error);
          return res.status(500).json({
            error: "Failed to upload image",
            details: error.message,
          });
        }

        profileImageUrl = `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/user_profiles/${filePath}`;
        await User.findOneAndUpdate(
          { uid: uid.trim() },
          { $set: { picture: profileImageUrl } },
          { new: true }
        );
      } catch (error) {
        console.error("Detailed upload error:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to upload image",
          details: error.message,
        });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (goal) updateData.goal = goal;
    if (gymName) updateData.gymName = gymName;
    if (bio) updateData.bio = bio;

    const user = await User.findOneAndUpdate(
      { uid },
      { $set: updateData },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Update user profile error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error("Bucket Listing Error:", error);
      return false;
    }
    console.log(
      "Available Buckets:",
      data.map((bucket) => bucket.name)
    );
    return true;
  } catch (err) {
    console.error("Supabase Connection Check Failed:", err);
    return false;
  }
};

export const createUser = async (req, res) => {
  const { uid, name, email, picture } = req.user;

  try {
    let user = await User.findOne({ uid });
    if (!user) {
      user = new User({ uid, name, email, picture });
      await user.save();
    }
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to create user" });
  }
};

export const createPost = async (req, res) => {
  const { name, description, image } = req.body;
  const { uid } = req.user;

  if (!name || !description) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide all fields" });
  }

  try {
    const post = new Entry({ uid, name, description, image });
    await post.save();
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ error: "Failed to create post" });
  }
};

export const getPostsByUID = async (req, res) => {
  try {
    const { uid } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;

    if (page < 1 || limit < 1) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid page or limit value" });
    }

    const skip = (page - 1) * limit;
    const posts = await Entry.find({ uid })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPosts = await Entry.countDocuments({ uid });
    const totalPages = Math.ceil(totalPosts / limit);

    res.json({
      success: true,
      data: posts,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalPosts: totalPosts,
        limit: limit,
      },
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ success: false, error: "Failed to retrieve posts" });
  }
};

export const isFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserUid = req.user.uid;

    const currentUser = await User.findOne({ uid: currentUserUid });
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "Current user not found",
      });
    }

    const targetUser = await User.findOne({ uid: userId });
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Target user not found",
      });
    }

    const isFollowing = targetUser.followers.includes(currentUser._id);

    res.status(200).json({
      success: true,
      isFollowing,
    });
  } catch (error) {
    console.error("Error checking follow status:", error);
    res.status(500).json({
      success: false,
      message: "Error checking follow status",
      error: error.message,
    });
  }
};

export const getCurrentUser = async (req, res) => {
  const { uid } = req.user;

  try {
    const user = await User.findOne({ uid }).select("uid name email picture");
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve user" });
  }
};

export const getUser = async (req, res) => {
  const { uid } = req.params;

  try {
    const user = await User.findOne({ uid }).select(
      "name picture bio gymName goal followers following"
    );
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("Error retrieving user:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to retrieve user" });
  }
};

export const searchUsers = async (req, res) => {
  const { query } = req.query;

  if (!query || query.trim() === "") {
    return res
      .status(400)
      .json({ success: false, message: "Search query is required" });
  }

  try {
    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { username: { $regex: query, $options: "i" } },
      ],
    })
      .select("name username picture uid")
      .limit(10);

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ success: false, message: "Failed to search users" });
  }
};

export const uploadBackgroundPicture = [
  handleFileUpload,
  async (req, res) => {
    try {
      const isConnected = await checkSupabaseConnection();
      if (!isConnected) {
        return res.status(500).json({ error: "Supabase connection failed" });
      }

      const user = req.user;
      const fileName = `background_${user.uid}_${Date.now()}${path.extname(
        req.file.originalname
      )}`;
      const filePath = `backgrounds/${fileName}`;

      const { error } = await supabase.storage
        .from("user_backgrounds")
        .upload(filePath, req.file.buffer, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        console.error("Supabase upload error:", error);
        return res.status(500).json({ error: "Failed to upload image" });
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("user_backgrounds").getPublicUrl(filePath);

      const updatedUser = await User.findOneAndUpdate(
        { uid: user.uid },
        { backgroundPicture: publicUrl },
        { new: true }
      );

      res.json({
        url: publicUrl,
        path: filePath,
        user: updatedUser,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: error.message });
    }
  },
];

export const uploadProfilePic = [
  handleFileUpload,
  async (req, res) => {
    try {
      const isConnected = await checkSupabaseConnection();
      if (!isConnected) {
        return res.status(500).json({ error: "Supabase connection failed" });
      }

      const user = req.user;
      const fileName = `profile_${user.uid}_${Date.now()}${path.extname(
        req.file.originalname
      )}`;
      const filePath = `profiles/${fileName}`;

      const { error } = await supabase.storage
        .from("user_profiles")
        .upload(filePath, req.file.buffer, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        console.error("Supabase upload error:", error);
        return res.status(500).json({ error: "Failed to upload image" });
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("user_profiles").getPublicUrl(filePath);

      const updatedUser = await User.findOneAndUpdate(
        { uid: user.uid },
        { picture: publicUrl },
        { new: true }
      );

      res.json({
        url: publicUrl,
        path: filePath,
        user: updatedUser,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: error.message });
    }
  },
];

export const followUser = async (req, res) => {
  try {
    const { uid } = req.user;
    const userToFollow = await User.findOne({ uid: req.params.userId });
    const currentUser = await User.findOne({ uid });

    if (!userToFollow || !currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (currentUser._id.equals(userToFollow._id)) {
      return res.status(400).json({ message: "Cannot follow yourself" });
    }

    if (!currentUser.following.includes(userToFollow._id)) {
      currentUser.following.push(userToFollow._id);
      userToFollow.followers.push(currentUser._id);
      await currentUser.save();
      await userToFollow.save();
      return res.status(200).json({ message: "Followed successfully" });
    }

    return res.status(200).json({ message: "Already following" });
  } catch (error) {
    console.error("Error in followUser:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const unfollowUser = async (req, res) => {
  try {
    const { uid } = req.user;
    const userToUnfollow = await User.findOne({ uid: req.params.userId });
    const currentUser = await User.findOne({ uid });

    if (!userToUnfollow || !currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (currentUser.following.includes(userToUnfollow._id)) {
      currentUser.following = currentUser.following.filter(
        (id) => !id.equals(userToUnfollow._id)
      );
      userToUnfollow.followers = userToUnfollow.followers.filter(
        (id) => !id.equals(currentUser._id)
      );
      await currentUser.save();
      await userToUnfollow.save();
      return res.status(200).json({ message: "Unfollowed successfully" });
    }

    return res.status(200).json({ message: "Not following" });
  } catch (error) {
    console.error("Error in unfollowUser:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    const user = await User.findById(req.body.userId);

    if (!post || !user) {
      return res.status(404).json({ message: "Post or user not found" });
    }

    if (!post.likes.includes(user._id)) {
      post.likes.push(user._id);
      await post.save();
    }
    res.status(200).json({ message: "Post liked" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const commentOnPost = async (req, res) => {
  try {
    const comment = new Comment({
      user: req.body.userId,
      post: req.params.postId,
      content: req.body.content,
    });
    await comment.save();
    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const { uid } = req.params;
    const user = await User.findOne({ uid })
      .populate("followers", "username name picture")
      .populate("following", "username name picture");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    const posts = await Entry.find({ uid }).populate("likes", "username");
    const comments = await Comment.find({ user: user._id }).populate("post");

    res.status(200).json({
      success: true,
      data: {
        user,
        posts,
        postsCount: posts.length,
        comments,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("uid name username picture")
      .sort({ name: 1 });

    if (!users || users.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No users found" });
    }

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ uid: userId }).populate({
      path: "followers",
      select: "uid name picture bio",
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user.followers || [],
    });
  } catch (error) {
    console.error("Get followers error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ uid: userId }).populate({
      path: "following",
      select: "uid name picture bio",
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user.following || [],
    });
  } catch (error) {
    console.error("Get following error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// import mongoose from "mongoose";
// // import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
// import { User, Post, Comment } from "../models/user.model.js";
// import { createClient } from "@supabase/supabase-js";
// import multer from "multer";
// import express from "express";
// import Entry from "../models/entry.model.js";
// import { verifyIdToken } from "../middleware/auth.js"; // Middleware to verify Firebase ID token
// import dotenv from "dotenv";
// import path from "path";
// import cors from "cors";
// import { supabase } from "../supabase/supabase.js";

// dotenv.config();

// const router = express.Router();

// // const supabase = createClient(
// //   process.env.VITE_SUPABASE_URL,
// //   process.env.VITE_SUPABASE_ANON_KEY
// // );

// const fileFilter = (req, file, cb) => {
//   const allowedTypes = ["image/jpeg", "image/png", "image/gif"];

//   if (allowedTypes.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new Error("Invalid file type"), false);
//   }
// };

// // Define multer middleware at the top level
// const storage = multer.memoryStorage();
// const upload = multer({
//   storage: storage,
//   fileFilter: fileFilter,
//   limits: {
//     fileSize: 20 * 1024 * 1024, // 5MB file size limit
//     fieldSize: 20 * 1024 * 1024, // 2MB field size limit
//   },
// });
// const uploadMiddleware = multer({
//   storage: storage,
//   fileFilter: fileFilter,
//   limits: {
//     fileSize: 20 * 1024 * 1024, // 5MB file size limit
//     fieldSize: 20 * 1024 * 1024, // 2MB field size limit
//   },
// }).single("profileImage");

// // get current mongoDB user
// export const getCurrentMongoDBUser = async (req, res) => {
//   const { uid } = req.user;

//   try {
//     // return al data from user
//     const user = await User.findOne({ uid });
//     // const user = await User.findOne({ uid }).select("uid name email picture");
//     res.status(200).json(user);
//   } catch (error) {
//     res.status(500).json({ error: "Failed to retrieve user" });
//   }
// };

// export const updateUserProfile = async (req, res) => {
//   try {
//     const { uid } = req.user;

//     // Use promisified version of multer middleware
//     await new Promise((resolve, reject) => {
//       uploadMiddleware(req, res, (err) => {
//         if (err) {
//           reject(err);
//         }
//         resolve();
//       });
//     });

//     // Extract fields from form data
//     const { name, goal, gymName, bio, profileImageName, profileImage } =
//       req.body;
//     // console.log("req.body.profileImage", req.body.profileImage);
//     // console.log("req.body.profileImageName", req.body.profileImageName);
//     // Validate that at least one field is provided
//     if (!name && !goal && !gymName && !bio && !profileImage) {
//       return res.status(400).json({
//         success: false,
//         message: "No data provided for update",
//       });
//     }

//     // Handle profile picture upload if present
//     if (profileImageName !== "undefined") {
//       try {
//         // Remove data:image/jpeg;base64, or similar prefix if present
//         const base64Data = profileImage.split(";base64,").pop();

//         // Convert base64 to buffer
//         const imageBuffer = Buffer.from(base64Data, "base64");

//         // Create a simple file path with timestamp
//         const timestamp = Date.now();
//         const filePath = `profiles/profile_${uid}/${profileImageName}_${timestamp}.jpg`;

//         // console.log("Debug - Upload attempt with path:", filePath);

//         // Upload to Supabase with error handling
//         const { data: file, error } = await supabase.storage
//           .from("user_profiles")
//           .upload(filePath, imageBuffer, {
//             contentType: "image/jpeg",
//             cacheControl: "3600",
//             upsert: true,
//           });

//         if (error) {
//           console.error("Supabase upload error details:", error);
//           return res.status(500).json({
//             error: "Failed to upload image",
//             details: error.message,
//           });
//         }

//         const profileImageUrl = `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/user_profiles/profiles/${filePath}`;
//         // console.log("Debug - Generated URL:", profileImageUrl);

//         await User.findOneAndUpdate(
//           { uid: uid.trim() },
//           { $set: { picture: profileImageUrl } },
//           { new: true }
//         );
//       } catch (error) {
//         console.error("Detailed upload error:", error);
//         return res.status(500).json({
//           success: false,
//           message: "Failed to upload image",
//           details: error.message,
//         });
//       }
//     }

//     // Build update object with only provided fields
//     const updateData = {};
//     if (name) updateData.name = name;
//     if (goal) updateData.goal = goal;
//     if (gymName) updateData.gymName = gymName;
//     if (bio) updateData.bio = bio;

//     // Update user in database with error handling
//     const user = await User.findOneAndUpdate(
//       { uid },
//       { $set: updateData },
//       { new: true }
//     );

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     // res.status(200).json({
//     //   success: true,
//     //   message: "Profile updated successfully",
//     //   data: user,
//     // });
//   } catch (error) {
//     console.error("Update user profile error:", error);
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // Middleware to handle file upload errors
// export const handleFileUpload = (req, res, next) => {
//   upload.single("profileImage")(req, res, (err) => {
//     if (err instanceof multer.MulterError) {
//       if (err.code === "LIMIT_FIELD_VALUE") {
//         return res.status(400).json({
//           message: "File too large. Please upload a smaller image (max 10MB).",
//         });
//       }
//     } else if (err) {
//       return res.status(400).json({
//         error: err.message,
//       });
//     }

//     if (!req.file) {
//       return res.status(400).json({ error: "No file uploaded" });
//     }

//     // console.log("Request body:", req.body);
//     // console.log("Request file:", req.file);

//     next();
//   });
// };

// export const checkSupabaseConnection = async () => {
//   try {
//     const supabase = createClient(
//       process.env.VITE_SUPABASE_URL,
//       process.env.VITE_SUPABASE_ANON_KEY
//     );

//     // Check basic connection
//     // console.log("Supabase URL:", process.env.VITE_SUPABASE_URL);
//     // console.log(
//     //   "Supabase Anon Key:",
//     //   process.env.VITE_SUPABASE_ANON_KEY ? "Present" : "Missing"
//     // );

//     // List buckets with detailed logging
//     const { data, error } = await supabase.storage.listBuckets();
//     if (error) {
//       console.error(
//         "Bucket Listing Error:",
//         error
//         //    {
//         //   code: error.code,
//         //   message: error.message,
//         //   details: error,
//         // }
//       );
//       return false;
//     }

//     console.log(
//       "Available Buckets:",
//       data.map((bucket) => bucket.name)
//     );

//     // Try to get a specific bucket
//     const bucketName = "user_profiles"; // Replace with your actual bucket name
//     const { data: bucketData, error: bucketError } =
//       await supabase.storage.getBucket(bucketName);

//     if (bucketError) {
//       console.error(`Error accessing bucket ${bucketName}:`, {
//         code: bucketError.code,
//         message: bucketError.message,
//       });
//       return false;
//     }

//     console.log(`Bucket ${bucketName} details:`, bucketData);

//     return true;
//   } catch (err) {
//     console.error("Comprehensive Supabase Connection Check Failed:", err);
//     return false;
//   }
// };

// // Create a new user
// export const createUser = async (req, res) => {
//   const { uid, name, email, picture } = req.user;

//   try {
//     let user = await User.findOne({ uid });

//     if (!user) {
//       user = new User({ uid, name, email, picture });
//       await user.save();
//     }

//     res.status(201).json(user);
//   } catch (error) {
//     res.status(500).json({ error: "Failed to create user" });
//   }
// };

// // Create a new entry
// export const createPost = async (req, res) => {
//   const entry = req.body; // user will send this data
//   // console.log("req:", req);
//   if (!entry.name || !entry.description) {
//     return res
//       .status(400)
//       .json({ success: false, message: "Please provide all fields", entry });
//   }
//   const { name, description, image } = req.body;
//   const { uid } = req.user;

//   try {
//     // console.log("UID:", uid);
//     const post = new Entry({ uid, name, description, image });
//     // console.log(post);
//     await post.save();
//     res.status(201).json(entry);
//   } catch (error) {
//     res.status(500).json({ error: "Failed to create entry1" });
//   }
// };

// // Get entries by UID from mongoDB database using pagination
// // export const getPostsByUID = async (req, res) => {
// //   const { uid } = req.params;

// //   // Extract pagination parameters from query string
// //   const page = parseInt(req.query.page) || 1; // Default to page 1
// //   const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page

// //   try {
// //     // Calculate the number of documents to skip
// //     const skip = (page - 1) * limit;

// //     // Fetch posts for the user with pagination
// //     const entries = await Entry.find({ uid })
// //       .skip(skip) // Skip the previous pages' documents
// //       .limit(limit); // Limit the number of documents returned

// //     // Get the total number of posts for the user (for calculating total pages)
// //     const totalEntries = await Entry.countDocuments({ uid });

// //     // Calculate total pages
// //     const totalPages = Math.ceil(totalEntries / limit);

// //     // Send response with posts and pagination metadata
// //     res.status(200).json({
// //       success: true,
// //       data: entries,
// //       pagination: {
// //         currentPage: page,
// //         totalPages: totalPages,
// //         totalEntries: totalEntries,
// //         limit: limit,
// //       },
// //     });
// //   } catch (error) {
// //     console.error("Error fetching entries:", error);
// //     res
// //       .status(500)
// //       .json({ success: false, error: "Failed to retrieve entries" });
// //   }
// // };

// export const isFollowing = async (req, res) => {
//   try {
//     const { userId } = req.params; // Firebase UID of the target user
//     const currentUserUid = req.user.uid; // Firebase UID of the current user

//     // Find the current user by Firebase UID to get their MongoDB _id
//     const currentUser = await User.findOne({ uid: currentUserUid });
//     if (!currentUser) {
//       return res.status(404).json({
//         success: false,
//         message: "Current user not found",
//       });
//     }

//     // Find the target user by Firebase UID (not _id)
//     const targetUser = await User.findOne({ uid: userId });
//     if (!targetUser) {
//       return res.status(404).json({
//         success: false,
//         message: "Target user not found",
//       });
//     }

//     // Check if the current user's _id is in the target user's followers array
//     const isFollowing = targetUser.followers.includes(currentUser._id);

//     res.status(200).json({
//       success: true,
//       isFollowing,
//     });
//   } catch (error) {
//     console.error("Error checking follow status:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error checking follow status",
//       error: error.message,
//     });
//   }
// };

// export const getPostsByUID = async (req, res) => {
//   try {
//     const { uid } = req.params;
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 6;

//     // Validate page and limit
//     if (page < 1 || limit < 1) {
//       return res
//         .status(400)
//         .json({ success: false, error: "Invalid page or limit value" });
//     }

//     const skip = (page - 1) * limit;

//     // Fetch posts for the user with pagination
//     const posts = await Entry.find({ uid })
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit);

//     // Get the total number of posts for the user
//     const totalPosts = await Entry.countDocuments({ uid });

//     // Calculate total pages
//     const totalPages = Math.ceil(totalPosts / limit);

//     res.json({
//       success: true,
//       data: posts,
//       pagination: {
//         currentPage: page,
//         totalPages: totalPages,
//         totalPosts: totalPosts,
//         limit: limit,
//       },
//     });
//   } catch (error) {
//     console.error("Error fetching posts:", error);
//     res.status(500).json({ success: false, error: "Failed to retrieve posts" });
//   }
// };

// // Get entries by UID
// // export const getPostsByUID = async (req, res) => {
// //   const { uid } = req.params;
// //   // console.log("UID:", uid);

// //   try {
// //     const entries = await Entry.find({ uid });
// //     res.status(200).json({ success: true, data: entries });
// //   } catch (error) {
// //     res.status(500).json({ error: "Failed to retrieve entries" });
// //   }
// //   //
// // };

// // get users in database sending back all users with name and UID
// // export const getUsers = async (req, res) => {
// //   try {
// //     const users = await User.find({}).select("name uid");
// //     res.status(200).json({ success: true, data: users });
// //   } catch (error) {
// //     res.status(500).json({ error: "Failed to retrieve users" });
// //   }
// // };

// export const getCurrentUser = async (req, res) => {
//   const { uid } = req.user;

//   try {
//     const user = await User.findOne({ uid }).select("uid name email picture");

//     res.status(200).json(user);
//   } catch (error) {
//     res.status(500).json({ error: "Failed to retrieve user" });
//   }
// };

// // get user UID and name
// // export const getUser = async (req, res) => {
// //   const { uid } = req.params;

// //   try {
// //     const user = await User.findOne({ uid }).select("name uid");
// //     res.status(200).json({ success: true, data: user });
// //   } catch (error) {
// //     res.status(500).json({ error: "Failed to retrieve user" });
// //   }
// // };

// export const getUser = async (req, res) => {
//   const { uid } = req.params; // Rename to userId to match frontend route (/user/:userId)

//   try {
//     const user = await User.findOne({ uid }).select(
//       "name picture bio gymName goal followers following"
//     );
//     if (!user) {
//       return res
//         .status(404)
//         .json({ success: false, message: "User not found" });
//     }
//     res.status(200).json({ success: true, data: user });
//   } catch (error) {
//     console.error("Error retrieving user:", error);
//     res
//       .status(500)
//       .json({ success: false, message: "Failed to retrieve user" });
//   }
// };

// export const searchUsers = async (req, res) => {
//   const { query } = req.query; // Get the search query from ?query=

//   if (!query || query.trim() === "") {
//     return res
//       .status(400)
//       .json({ success: false, message: "Search query is required" });
//   }

//   try {
//     const users = await User.find({
//       $or: [
//         { name: { $regex: query, $options: "i" } }, // Search name (case-insensitive)
//         { username: { $regex: query, $options: "i" } }, // Search username (case-insensitive)
//       ],
//     })
//       .select("name username picture uid") // Return name, username, picture, and _id
//       .limit(10); // Limit to 10 results for performance

//     res.status(200).json({ success: true, data: users });
//   } catch (error) {
//     console.error("Error searching users:", error);
//     res.status(500).json({ success: false, message: "Failed to search users" });
//   }
// };

// // get user profile (User info and posts)
// // export const getUserProfile = async (req, res) => {
// //   const { uid } = req.params;

// //   try {
// //     const user = await User.findOne({ uid }).select(
// //       "name email picture bio goal gymName backgroundPicture"
// //     );
// //     const postsLength = await Entry.find({ uid });
// //     const postsCount = postsLength.length;
// //     res.status(200).json({ success: true, data: user, postsCount });
// //   } catch (error) {
// //     res.status(500).json({ error: "Failed to retrieve user profile" });
// //   }
// // };

// export const uploadBackgroundPicture = [
//   handleFileUpload,

//   async (req, res) => {
//     try {
//       const isConnected = await checkSupabaseConnection();
//       if (!isConnected) {
//         return res.status(500).json({ error: "Supabase connection failed" });
//       }

//       // get image and user from frontend
//       const user = req.user;
//       const fileName = `background_${user.uid}_${Date.now()}${path.extname(
//         req.file.originalname
//       )}`;
//       const filePath = `backgrounds/${fileName}`;

//       const { data: file, error } = await supabase.storage
//         .from("user_backgrounds")
//         .upload(filePath, req.file.buffer, {
//           cacheControl: "3600",
//           upsert: true,
//         });

//       if (error) {
//         console.error("Supabase upload error:", error);
//         return res.status(500).json({ error: "Failed to upload image" });
//       }

//       const { publicUrl } = supabase.storage
//         .from("user_backgrounds")
//         .getPublicUrl(filePath);

//       const updatedUser = await User.findByIdAndUpdate(
//         user._id,
//         {
//           backgroundPicture: {
//             url: publicUrl,
//           },
//         },
//         { new: true }
//       );
//       // console.log("Updated user:", updatedUser);

//       res.json({
//         url: publicUrl,
//         path: filePath,
//         user: updatedUser,
//       });
//     } catch (error) {
//       console.error("Upload error:", error);
//       res.status(500).json({ error: error.message });
//     }
//   }, // save url to mongoDB in user
// ];

// export const uploadProfilePic = [
//   // First, use the file upload middleware
//   handleFileUpload,

//   async (req, res) => {
//     try {
//       const isConnected = await checkSupabaseConnection();
//       // console.log(process.env.VITE_SUPABASE_URL); // "123"
//       // console.log(process.env.VITE_SUPABASE_ANON_KEY); // undefined
//       if (!isConnected) {
//         return res.status(500).json({ error: "Supabase connection failed" });
//       }

//       const user = req.user; // Assuming user is set in req by authentication middleware
//       const fileName = `profile_${user.uid}_${Date.now()}${path.extname(
//         req.file.originalname
//       )}`;
//       const filePath = `profiles/${fileName}`;

//       const { data: file, error } = await supabase.storage
//         .from("user_profiles")
//         .upload(filePath, req.file.buffer, {
//           cacheControl: "3600",
//           upsert: true,
//         });

//       if (error) {
//         console.error("Supabase upload error:", error);
//         return res.status(500).json({ error: "Failed to upload image" });
//       }

//       const { publicUrl } = supabase.storage
//         .from("user_profiles")
//         .getPublicUrl(filePath);

//       const updatedUser = await User.findByIdAndUpdate(
//         user._id,
//         {
//           profilePicture: {
//             url: publicUrl,
//             storagePath: filePath,
//           },
//         },
//         { new: true }
//       );
//       // console.log("Updated user:", updatedUser);
//       res.json({
//         url: publicUrl,
//         path: filePath,
//         user: updatedUser,
//       });
//     } catch (error) {
//       console.error("Upload error:", error);
//       res.status(500).json({ error: error.message });
//     }
//   },
// ];

// export const followUser = async (req, res) => {
//   try {
//     // Log request details for debugging
//     console.log("req.user:", req.user);
//     console.log("req.params.userId:", req.params.userId);

//     // Validate req.user and uid
//     if (!req.user || !req.user.uid) {
//       return res.status(401).json({ message: "Unauthorized: No user data" });
//     }
//     const { uid } = req.user;

//     // Find users by Firebase UID (stored in uid field)
//     const userToFollow = await User.findOne({ uid: req.params.userId });
//     const currentUser = await User.findOne({ uid });

//     // Log user data
//     console.log("userToFollow:", userToFollow);
//     console.log("currentUser:", currentUser);

//     // Check if users exist
//     if (!userToFollow || !currentUser) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Prevent self-follow
//     if (currentUser._id.equals(userToFollow._id)) {
//       return res.status(400).json({ message: "Cannot follow yourself" });
//     }

//     // Check if already following
//     if (!currentUser.following.includes(userToFollow._id)) {
//       currentUser.following.push(userToFollow._id);
//       userToFollow.followers.push(currentUser._id);
//       await currentUser.save();
//       await userToFollow.save();
//       return res.status(200).json({ message: "Followed successfully" });
//     }

//     return res.status(200).json({ message: "Already following" });
//   } catch (error) {
//     // Log full error for debugging
//     console.error("Error in followUser:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// export const unfollowUser = async (req, res) => {
//   try {
//     // Log request details for debugging
//     console.log("req.user:", req.user);
//     console.log("req.params.userId:", req.params.userId);

//     // Validate req.user and uid
//     if (!req.user || !req.user.uid) {
//       return res.status(401).json({ message: "Unauthorized: No user data" });
//     }
//     const { uid } = req.user;

//     // Find users by Firebase UID (stored in uid field)
//     const userToUnfollow = await User.findOne({ uid: req.params.userId });
//     const currentUser = await User.findOne({ uid });

//     // Log user data
//     console.log("userToUnfollow:", userToUnfollow);
//     console.log("currentUser:", currentUser);

//     // Check if users exist
//     if (!userToUnfollow || !currentUser) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Check if following
//     if (currentUser.following.includes(userToUnfollow._id)) {
//       currentUser.following = currentUser.following.filter(
//         (id) => !id.equals(userToUnfollow._id)
//       );
//       userToUnfollow.followers = userToUnfollow.followers.filter(
//         (id) => !id.equals(currentUser._id)
//       );
//       await currentUser.save();
//       await userToUnfollow.save();
//       return res.status(200).json({ message: "Unfollowed successfully" });
//     }

//     return res.status(200).json({ message: "Not following" });
//   } catch (error) {
//     // Log full error for debugging
//     console.error("Error in unfollowUser:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// export const likePost = async (req, res) => {
//   try {
//     const post = await Post.findById(req.params.postId);
//     const user = await User.findById(req.body.userId);

//     if (!post || !user)
//       return res.status(404).json({ message: "Post or user not found" });

//     if (!post.likes.includes(user._id)) {
//       post.likes.push(user._id);
//       await post.save();
//     }
//     res.status(200).json({ message: "Post liked" });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// export const commentOnPost = async (req, res) => {
//   try {
//     const comment = new Comment({
//       user: req.body.userId,
//       post: req.params.postId,
//       content: req.body.content,
//     });
//     await comment.save();
//     res.status(201).json(comment);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// // export const getUserProfile = async (req, res) => {
// //   try {
// //     const { uid } = req.params;
// //     const user = await User.findOne({ uid })
// //       .populate("followers", "username name picture")
// //       .populate("following", "username name picture");
// //     const posts = await Post.find({ user: req.params.userId }).populate(
// //       "likes",
// //       "username"
// //     );
// //     const comments = await Comment.find({ user: req.params.userId }).populate(
// //       "post"
// //     );
// //     res.status(200).json({ user, posts, comments });
// //   } catch (error) {
// //     res.status(500).json({ error: error.message });
// //   }
// // };

// export const getUserProfile = async (req, res) => {
//   try {
//     const { uid } = req.params;
//     const user = await User.findOne({ uid })
//       .populate("followers", "username name picture")
//       .populate("following", "username name picture");
//     if (!user) {
//       return res
//         .status(404)
//         .json({ success: false, message: "User not found" });
//     }
//     Entry.find({ uid });
//     const posts = await Entry.find({ uid }).populate("likes", "username");
//     const comments = await Comment.find({ user: user._id }).populate("post");

//     res.status(200).json({
//       success: true,
//       data: {
//         user,
//         posts,
//         postsCount: posts.length,
//         comments,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// export const getUsers = async (req, res) => {
//   try {
//     const users = await User.find()
//       .select("uid name username picture") // Only return necessary fields
//       .sort({ name: 1 }); // Sort alphabetically by name (1 = ascending, -1 = descending)

//     if (!users || users.length === 0) {
//       return res
//         .status(404)
//         .json({ success: false, message: "No users found" });
//     }

//     res.status(200).json({
//       success: true,
//       data: users,
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // Add these functions to your user.controller.js file

// export const getFollowers = async (req, res) => {
//   try {
//     const { userId } = req.params;

//     const user = await User.findOne({ uid: userId }).populate({
//       path: "followers",
//       select: "uid name picture bio",
//     });

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       data: user.followers || [],
//     });
//   } catch (error) {
//     console.error("Get followers error:", error);
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// export const getFollowing = async (req, res) => {
//   try {
//     const { userId } = req.params;

//     const user = await User.findOne({ uid: userId }).populate({
//       path: "following",
//       select: "uid name picture bio",
//     });

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       data: user.following || [],
//     });
//   } catch (error) {
//     console.error("Get following error:", error);
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// export default router;
