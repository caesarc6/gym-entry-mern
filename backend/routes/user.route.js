import express from "express";
import multer from "multer";
import User from "../models/user.model.js";
import { supabase } from "../supabase/supabase.js";
// import { verifyIdToken } from "../middleware/auth.js";

import {
  createUser,
  createPost,
  getPostsByUID,
  getUsers,
  getCurrentUser,
  getUser,
  getUserProfile,
  getCurrentMongoDBUser,
  // uploadProfilePic,
  // updateUserProfile,
  // handleFileUpload,
  followUser,
  unfollowUser,
  likePost,
  commentOnPost,
  getFollowers,
  getFollowing,
  searchUsers,
} from "../controllers/user.controller.js";
import { verifyIdToken } from "../middleware/auth.js"; // Middleware to verify Firebase ID token

const router = express.Router();

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB file size limit
    fieldSize: 20 * 1024 * 1024, // 20MB field size limit
  },
});

// Route for updating background picture
router.post(
  "/updateUserBackgroundPicture",
  verifyIdToken,
  upload.single("backgroundPicture"),
  async (req, res) => {
    try {
      const { uid } = req.user;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No background picture provided",
        });
      }

      const timestamp = Date.now();
      const filePath = `profiles/profile_${uid}/_backgroundProfile/file_${timestamp}.jpg`;

      const { error } = await supabase.storage
        .from("user_profiles")
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype, // Use the actual mimetype from the file
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        console.error("Supabase upload error:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to upload background picture",
          details: error.message,
        });
      }

      const backgroundPictureUrl = `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/user_profiles/${filePath}`;

      const user = await User.findOneAndUpdate(
        { uid },
        { $set: { backgroundPicture: backgroundPictureUrl } },
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
        message: "Background picture updated successfully",
        data: user,
      });
    } catch (error) {
      console.error("Update background picture error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// Route for updating user profile
router.post(
  "/updateUserProfile",
  verifyIdToken,
  upload.single("profileImage"),
  async (req, res) => {
    try {
      const { uid } = req.user;
      const { name, goal, gymName, bio } = req.body;

      if (!name && !goal && !gymName && !bio && !req.file) {
        return res.status(400).json({
          success: false,
          message: "No data provided for update",
        });
      }

      let profileImageUrl = null;

      if (req.file) {
        const timestamp = Date.now();
        const filePath = `profiles/profile_${uid}/file_${timestamp}.jpg`;

        const { error } = await supabase.storage
          .from("user_profiles")
          .upload(filePath, req.file.buffer, {
            contentType: req.file.mimetype, // Use the actual mimetype from the file
            cacheControl: "3600",
            upsert: true,
          });

        if (error) {
          console.error("Supabase upload error:", error);
          return res.status(500).json({
            success: false,
            message: "Failed to upload profile image",
            details: error.message,
          });
        }

        profileImageUrl = `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/user_profiles/${filePath}`;
      }

      const updateData = {};
      if (name) updateData.name = name;
      if (goal) updateData.goal = goal;
      if (gymName) updateData.gymName = gymName;
      if (bio) updateData.bio = bio;
      if (profileImageUrl) updateData.picture = profileImageUrl;

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
  }
);

// Check if current user is following another user
router.get("/isFollowing/:userId", verifyIdToken, async (req, res) => {
  try {
    const currentUser = await User.findOne({ uid: req.user.uid });
    const targetUser = await User.findById(req.params.userId);

    if (!targetUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const isFollowing = currentUser.following.includes(targetUser._id);
    res.status(200).json({ success: true, isFollowing });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/users/:userId/followers", verifyIdToken, getFollowers);
router.get("/users/:userId/following", verifyIdToken, getFollowing);

// Other routes remain unchanged
router.get("/createUsers", verifyIdToken, createUser);
router.post("/posts", verifyIdToken, createPost);
router.get("/posts/:uid", verifyIdToken, getPostsByUID);
// router.get("/getUsers", verifyIdToken, getUsers);
router.get("/getCurrentUser", verifyIdToken, getCurrentUser);
router.get("/getUser/:uid", getUser);
router.get("/getUserProfile/:uid", verifyIdToken, getUserProfile);
router.get("/getCurrentMongoDBUser", verifyIdToken, getCurrentMongoDBUser);

// New social feature routes
router.post("/follow/:userId", followUser);
router.post("/unfollow/:userId", unfollowUser);
// router.post("/posts", createPost);
router.post("/posts/:postId/like", likePost);
router.post("/posts/:postId/comment", commentOnPost);
router.get("/getUsers", verifyIdToken, getUsers);
router.get("/searchUsers", searchUsers);

export default router;
