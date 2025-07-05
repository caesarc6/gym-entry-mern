import express from "express";
import { verifyIdToken } from "../middleware/auth.js";
import {
  processWorkoutEntry,
  getWorkoutAnalytics,
  getExerciseProgress,
  getPersonalRecords,
  getAllWorkouts,
  reprocessAllWorkouts,
  reprocessAllWorkoutsWithGymNormalization,
  completelyReprocessAllWorkouts,
} from "../controllers/workout.controller.js";

const router = express.Router();

// Process workout data from an entry
router.post("/process/:entryId", verifyIdToken, processWorkoutEntry);

// Get all workouts for the current user
router.get("/", verifyIdToken, getAllWorkouts);

// Get workout analytics
router.get("/analytics", verifyIdToken, getWorkoutAnalytics);

// Get exercise progress over time
router.get("/progress", verifyIdToken, getExerciseProgress);

// Get personal records
router.get("/prs", verifyIdToken, getPersonalRecords);

// Reprocess all workouts to update exercise names
router.post("/reprocess-all", verifyIdToken, reprocessAllWorkouts);

// Reprocess all workouts to update gym names and exercise names
router.post(
  "/reprocess-all-with-gym-normalization",
  verifyIdToken,
  reprocessAllWorkoutsWithGymNormalization
);

// Completely reprocess all workouts from original entry descriptions
router.post(
  "/completely-reprocess-all",
  verifyIdToken,
  completelyReprocessAllWorkouts
);

export default router;
