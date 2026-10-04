import express from "express";
import { verifyIdToken } from "../middleware/auth.js";
import {
  processWorkoutEntry,
  getWorkoutAnalytics,
  getExerciseProgress,
  getPersonalRecords,
  getAllWorkouts,
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

export default router;
