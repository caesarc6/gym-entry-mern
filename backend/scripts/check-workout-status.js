/**
 * Quick script to check the status of workouts in the database
 * Shows both active and inactive workouts
 */

import mongoose from "mongoose";
import SharedWorkout from "../models/sharedWorkout.model.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

const checkWorkoutStatus = async () => {
  try {

    // Connect to database
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      "mongodb://localhost:27017/gym-entry-mern";
    await mongoose.connect(mongoUri);

    // Get all workouts (active and inactive)
    const allWorkouts = await SharedWorkout.find({}).sort({ createdAt: -1 });

    const activeWorkouts = allWorkouts.filter((w) => w.isActive === true);
    const inactiveWorkouts = allWorkouts.filter((w) => w.isActive === false);


    if (inactiveWorkouts.length > 0) {

      inactiveWorkouts.forEach((workout, index) => {
      });

    } else {
    }

    if (activeWorkouts.length > 0) {

      // Group by creator
      const byCreator = {};
      activeWorkouts.forEach((workout) => {
        const creator = workout.creatorName || "Unknown";
        if (!byCreator[creator]) byCreator[creator] = [];
        byCreator[creator].push(workout);
      });

      Object.keys(byCreator).forEach((creator) => {
        byCreator[creator].slice(0, 5).forEach((workout, i) => {
        });
        if (byCreator[creator].length > 5) {
        }
      });
    }


    if (inactiveWorkouts.length > 0) {
    } else {
    }

  } catch (error) {
  } finally {
    await mongoose.disconnect();
  }
};

// Run the check
checkWorkoutStatus();
