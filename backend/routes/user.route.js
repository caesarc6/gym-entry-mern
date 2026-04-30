import express from "express";
import { verifyIdToken } from "../middleware/auth.js";
import { User } from "../models/user.model.js";
import Entry from "../models/entry.model.js";
import {
  getUserProfileByUsername,
  updateUserPrivacy,
  checkFollowing,
  getCurrentMongoDBUser,
  updateUserProfile,
  handleFileUpload,
  handleOptionalFileUpload,
  createUser,
  createPost,
  getPostsByUID,
  isFollowing,
  getCurrentUser,
  getUser,
  searchUsers,
  uploadBackgroundPicture,
  uploadProfilePic,
  followUser,
  unfollowUser,
  likePost,
  commentOnPost,
  getUserProfile,
  getUsers,
  getFollowers,
  getFollowing,
  getFeedPosts,
  getHomeFeed,
  sendFollowRequest,
  acceptFollowRequest,
  rejectFollowRequest,
  getPendingFollowRequests,
  checkFollowRequestStatus,
  cancelFollowRequest,
  getBatchProfileImages,
  getProfileImageByUid,
  requestTrainerDashboardAccess,
  checkTrainerDashboardAccess,
  checkIsAdmin,
  getTrainerDashboardRequests,
  approveTrainerDashboardAccess,
  rejectTrainerDashboardAccess,
  getWorkoutHabitSummary,
} from "../controllers/user.controller.js";
import {
  linkFirebaseToSupabase,
  getMigrationStatus,
} from "../controllers/migration.controller.js";

const router = express.Router();

// Get user profile by username (for public viewing)
router.get("/profile/:username", verifyIdToken, getUserProfileByUsername);

// Update user privacy settings (requires authentication)
router.put("/privacy", verifyIdToken, updateUserPrivacy);

// Check if a user is following another user
router.get("/following/:targetUserId", verifyIdToken, checkFollowing);

// Get user profile image by UID (for ProductCard)
router.get("/users/:uid", getUser);

// Get batch profile images for multiple users (optimized for mobile)
router.post("/batch-profile-images", verifyIdToken, getBatchProfileImages);

// Get user profile image by UID (public endpoint for ProductCard)
router.get("/profile-image/:uid", getProfileImageByUid);

// Additional routes
router.get("/getCurrentMongoDBUser", verifyIdToken, getCurrentMongoDBUser);
router.post(
  "/updateUserProfile",
  verifyIdToken,
  handleOptionalFileUpload,
  updateUserProfile,
);
router.get("/createUsers", verifyIdToken, createUser);
router.post("/posts", verifyIdToken, createPost);
router.get("/posts/home-feed", verifyIdToken, getHomeFeed);
router.get("/workout-habit-summary", verifyIdToken, getWorkoutHabitSummary);
router.get("/posts/:uid", verifyIdToken, getPostsByUID);
router.get("/posts/userId/:userId", verifyIdToken, getPostsByUID);
router.get("/isFollowing/:userId", verifyIdToken, isFollowing);
router.get("/getCurrentUser", verifyIdToken, getCurrentUser);
router.get("/getUserProfile/:uid", verifyIdToken, getUserProfile);
router.get("/getUserProfile/userId/:userId", verifyIdToken, getUserProfile);
router.get("/getUsers", verifyIdToken, getUsers);
router.get("/searchUsers", searchUsers);
router.post(
  "/updateUserBackgroundPicture",
  verifyIdToken,
  uploadBackgroundPicture,
);
router.post("/updateUserProfilePic", verifyIdToken, uploadProfilePic);
router.post("/follow/:userId", verifyIdToken, followUser);
router.post("/unfollow/:userId", verifyIdToken, unfollowUser);
router.post("/posts/:postId/like", verifyIdToken, likePost);
router.post("/posts/:postId/comment", verifyIdToken, commentOnPost);
router.get("/users/:userId/followers", verifyIdToken, getFollowers);
router.get("/users/:userId/following", verifyIdToken, getFollowing);
router.post("/posts/feed", verifyIdToken, getFeedPosts);

// Follow request routes
router.post("/follow-request/:userId", verifyIdToken, sendFollowRequest);
router.delete("/follow-request/:userId", verifyIdToken, cancelFollowRequest);
router.post(
  "/follow-request/:requestId/accept",
  verifyIdToken,
  acceptFollowRequest,
);
router.post(
  "/follow-request/:requestId/reject",
  verifyIdToken,
  rejectFollowRequest,
);
router.get("/follow-requests/pending", verifyIdToken, getPendingFollowRequests);
router.get(
  "/follow-request/status/:userId",
  verifyIdToken,
  checkFollowRequestStatus,
);

// Trainer dashboard access routes
router.post(
  "/trainer-dashboard/request",
  verifyIdToken,
  requestTrainerDashboardAccess,
);
router.get(
  "/trainer-dashboard/access",
  verifyIdToken,
  checkTrainerDashboardAccess,
);

// Admin routes
router.get("/admin/check", verifyIdToken, checkIsAdmin);
router.get(
  "/admin/trainer-dashboard-requests",
  verifyIdToken,
  getTrainerDashboardRequests,
);
router.post(
  "/admin/trainer-dashboard/approve/:userId",
  verifyIdToken,
  approveTrainerDashboardAccess,
);
router.post(
  "/admin/trainer-dashboard/reject/:userId",
  verifyIdToken,
  rejectTrainerDashboardAccess,
);

// Migration routes
router.post("/migration/link", verifyIdToken, linkFirebaseToSupabase);
router.get("/migration/status", verifyIdToken, getMigrationStatus);

export default router;

// import express from "express";
// import multer from "multer";
// import User from "../models/user.model.js";
// import { supabase } from "../supabase/supabase.js";
// import {
//   createUser,
//   createPost,
//   getPostsByUID,
//   getUsers,
//   getCurrentUser,
//   getUser,
//   getUserProfile,
//   getCurrentMongoDBUser,
//   followUser,
//   unfollowUser,
//   likePost,
//   commentOnPost,
//   getFollowers,
//   getFollowing,
//   searchUsers,
//   isFollowing,
// } from "../controllers/user.controller.js";
// import { verifyIdToken } from "../middleware/auth.js";
// import mongoose from "mongoose";

// const router = express.Router();

// const storage = multer.memoryStorage();

// const fileFilter = (req, file, cb) => {
//   const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
//   if (allowedTypes.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new Error("Invalid file type"), false);
//   }
// };

// const upload = multer({
//   storage: storage,
//   fileFilter: fileFilter,
//   limits: {
//     fileSize: 20 * 1024 * 1024, // 20MB file size limit
//     fieldSize: 20 * 1024 * 1024, // 20MB field size limit
//   },
// });

// // Route for updating background picture
// router.post(
//   "/updateUserBackgroundPicture",
//   verifyIdToken,
//   upload.single("backgroundPicture"),
//   async (req, res) => {
//     try {
//       const { uid } = req.user;

//       if (!req.file) {
//         return res.status(400).json({
//           success: false,
//           message: "No background picture provided",
//         });
//       }

//       const timestamp = Date.now();
//       const filePath = `profiles/profile_${uid}/_backgroundProfile/file_${timestamp}.jpg`;

//       const { error } = await supabase.storage
//         .from("user_profiles")
//         .upload(filePath, req.file.buffer, {
//           contentType: req.file.mimetype,
//           cacheControl: "3600",
//           upsert: true,
//         });

//       if (error) {
//         return res.status(500).json({
//           success: false,
//           message: "Failed to upload background picture",
//           details: error.message,
//         });
//       }

//       const backgroundPictureUrl = `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/user_profiles/${filePath}`;

//       const user = await User.findOneAndUpdate(
//         { uid },
//         { $set: { backgroundPicture: backgroundPictureUrl } },
//         { new: true }
//       );

//       if (!user) {
//         return res.status(404).json({
//           success: false,
//           message: "User not found",
//         });
//       }

//       res.status(200).json({
//         success: true,
//         message: "Background picture updated successfully",
//         data: user,
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: error.message,
//       });
//     }
//   }
// );

// // Route for updating user profile
// router.post(
//   "/updateUserProfile",
//   verifyIdToken,
//   upload.single("profileImage"),
//   async (req, res) => {
//     try {
//       const { uid } = req.user;
//       const { name, goal, gymName, bio } = req.body;

//       if (!name && !goal && !gymName && !bio && !req.file) {
//         return res.status(400).json({
//           success: false,
//           message: "No data provided for update",
//         });
//       }

//       let profileImageUrl = null;

//       if (req.file) {
//         const timestamp = Date.now();
//         const filePath = `profiles/profile_${uid}/file_${timestamp}.jpg`;

//         const { error } = await supabase.storage
//           .from("user_profiles")
//           .upload(filePath, req.file.buffer, {
//             contentType: req.file.mimetype,
//             cacheControl: "3600",
//             upsert: true,
//           });

//         if (error) {
//           return res.status(500).json({
//             success: false,
//             message: "Failed to upload profile image",
//             details: error.message,
//           });
//         }

//         profileImageUrl = `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/user_profiles/${filePath}`;
//       }

//       const updateData = {};
//       if (name) updateData.name = name;
//       if (goal) updateData.goal = goal;
//       if (gymName) updateData.gymName = gymName;
//       if (bio) updateData.bio = bio;
//       if (profileImageUrl) updateData.picture = profileImageUrl;

//       const user = await User.findOneAndUpdate(
//         { uid },
//         { $set: updateData },
//         { new: true }
//       );

//       if (!user) {
//         return res.status(404).json({
//           success: false,
//           message: "User not found",
//         });
//       }

//       res.status(200).json({
//         success: true,
//         message: "Profile updated successfully",
//         data: user,
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: error.message,
//       });
//     }
//   }
// );

// router.get("/isFollowing/:userId", verifyIdToken, isFollowing);

// router.get("/users/:userId/followers", verifyIdToken, getFollowers);
// router.get("/users/:userId/following", verifyIdToken, getFollowing);

// // Other routes remain unchanged
// router.get("/createUsers", verifyIdToken, createUser);
// router.post("/posts", verifyIdToken, createPost);
// router.get("/posts/:uid", verifyIdToken, getPostsByUID);
// router.get("/getCurrentUser", verifyIdToken, getCurrentUser);
// router.get("/getUser/:uid", getUser);
// router.get("/getUserProfile/:uid", verifyIdToken, getUserProfile);
// router.get("/getCurrentMongoDBUser", verifyIdToken, getCurrentMongoDBUser);

// // New social feature routes
// router.post("/follow/:userId", verifyIdToken, followUser);
// router.post("/unfollow/:userId", verifyIdToken, unfollowUser);
// router.post("/posts/:postId/like", likePost);
// router.post("/posts/:postId/comment", commentOnPost);
// router.get("/getUsers", verifyIdToken, getUsers);
// router.get("/searchUsers", searchUsers);

// export default router;
