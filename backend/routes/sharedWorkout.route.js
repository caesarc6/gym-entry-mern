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
} from "../controllers/sharedWorkout.controller.js";
import { verifyIdToken } from "../middleware/auth.js";

const router = express.Router();

// Shared Workout Management Routes
router.post("/", verifyIdToken, createSharedWorkout);
router.get("/trainer", verifyIdToken, getTrainerSharedWorkouts);
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

// Test route
router.get("/test/health", (req, res) => {
  res.json({ success: true, message: "Shared workout routes are working" });
});

export default router;
