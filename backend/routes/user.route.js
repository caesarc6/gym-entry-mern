import express from "express";
import { verifyIdToken } from "../middleware/auth.js";
import {
  updateUserPrivacy,
  getCurrentMongoDBUser,
  updateUserProfile,
  handleOptionalFileUpload,
  createPost,
  handlePostImageUpload,
  getPostsByUID,
  getCurrentUser,
  getUserProfile,
  uploadBackgroundPicture,
  uploadProfilePic,
  unfollowUser,
  getFollowers,
  getFollowing,
  getHomeFeed,
  sendFollowRequest,
  acceptFollowRequest,
  rejectFollowRequest,
  getPendingFollowRequests,
  checkFollowRequestStatus,
  cancelFollowRequest,
  getProfileImageByUid,
  checkTrainerDashboardAccess,
  checkIsAdmin,
  getTrainerDashboardRequests,
  approveTrainerDashboardAccess,
  rejectTrainerDashboardAccess,
  getWorkoutHabitSummary,
  searchUsers,
  deleteAccount,
} from "../controllers/user.controller.js";
import { linkFirebaseToSupabase } from "../controllers/migration.controller.js";

const router = express.Router();

router.put("/privacy", verifyIdToken, updateUserPrivacy);
router.delete("/account", verifyIdToken, deleteAccount);

router.get("/profile-image/:uid", getProfileImageByUid);

router.get("/getCurrentMongoDBUser", verifyIdToken, getCurrentMongoDBUser);
router.post(
  "/updateUserProfile",
  verifyIdToken,
  handleOptionalFileUpload,
  updateUserProfile,
);
router.post("/posts", verifyIdToken, handlePostImageUpload, createPost);
router.get("/posts/home-feed", verifyIdToken, getHomeFeed);
router.get("/workout-habit-summary", verifyIdToken, getWorkoutHabitSummary);
router.get("/posts/:uid", verifyIdToken, getPostsByUID);
router.get("/getCurrentUser", verifyIdToken, getCurrentUser);
router.get("/getUserProfile/:uid", verifyIdToken, getUserProfile);
router.get("/searchUsers", verifyIdToken, searchUsers);
router.post(
  "/updateUserBackgroundPicture",
  verifyIdToken,
  uploadBackgroundPicture,
);
router.post("/updateUserProfilePic", verifyIdToken, uploadProfilePic);
router.post("/unfollow/:userId", verifyIdToken, unfollowUser);
router.get("/users/:userId/followers", verifyIdToken, getFollowers);
router.get("/users/:userId/following", verifyIdToken, getFollowing);

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

router.get(
  "/trainer-dashboard/access",
  verifyIdToken,
  checkTrainerDashboardAccess,
);

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

router.post("/migration/link", verifyIdToken, linkFirebaseToSupabase);

export default router;
