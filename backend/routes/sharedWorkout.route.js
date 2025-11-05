import express from "express";
import {
  createSharedWorkout,
  getTrainerSharedWorkouts,
  getSharedWorkout,
  updateSharedWorkout,
  deleteSharedWorkout,
  shareWorkoutToUser,
  getTrainerAssignments,
  getUserAssignments,
  updateWorkoutAssignment,
  markWorkoutAsSaved,
  continueAssignedWorkout,
  completeAssignedWorkout,
  checkPendingWorkouts,
  claimPendingWorkouts,
  generateShareableLink,
  getSharedWorkoutByToken,
  saveSharedWorkoutToAccount,
  getTrainerClients,
  generateClientShareableLink,
  getClientWorkoutsByToken,
  claimClientWorkoutsByToken,
} from "../controllers/sharedWorkout.controller.js";
import { verifyIdToken } from "../middleware/auth.js";

const router = express.Router();

// Shared Workout Management Routes
router.post("/", verifyIdToken, createSharedWorkout);
router.get("/trainer", verifyIdToken, getTrainerSharedWorkouts);
router.get("/clients", verifyIdToken, getTrainerClients);
router.get("/:sharedWorkoutId", verifyIdToken, getSharedWorkout);
router.put("/:sharedWorkoutId", verifyIdToken, updateSharedWorkout);
router.delete("/:sharedWorkoutId", verifyIdToken, deleteSharedWorkout);

// Sharing Routes
router.post("/:sharedWorkoutId/share", verifyIdToken, shareWorkoutToUser);
router.get("/assignments/trainer", verifyIdToken, getTrainerAssignments);
router.get("/assignments/user", verifyIdToken, getUserAssignments);
router.put("/assignments/:shareId", verifyIdToken, updateWorkoutAssignment);
router.put("/assignments/:shareId/save", verifyIdToken, markWorkoutAsSaved);
router.put(
  "/assignments/:shareId/continue",
  verifyIdToken,
  continueAssignedWorkout
);
router.put(
  "/assignments/:shareId/complete",
  verifyIdToken,
  completeAssignedWorkout
);

// Workout claiming routes (for new users)
router.post("/check-pending", checkPendingWorkouts);
router.post("/claim-pending", verifyIdToken, claimPendingWorkouts);

// Shareable link routes
router.post(
  "/:sharedWorkoutId/generate-link",
  verifyIdToken,
  generateShareableLink
);
router.get("/shared/:shareToken", getSharedWorkoutByToken); // Public route
router.post(
  "/shared/:shareToken/save",
  verifyIdToken,
  saveSharedWorkoutToAccount
);

// Client shareable link routes (for all workouts under a client name)
router.post(
  "/generate-client-link",
  verifyIdToken,
  generateClientShareableLink
);
router.get("/client-claim/:shareToken", getClientWorkoutsByToken); // Public route
router.post(
  "/client-claim/:shareToken/claim",
  verifyIdToken,
  claimClientWorkoutsByToken
);

// Test route
router.get("/test/health", (req, res) => {
  res.json({ success: true, message: "Shared workout routes are working" });
});

export default router;
