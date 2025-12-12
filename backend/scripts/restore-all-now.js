/**
 * Simple non-interactive script to restore ALL inactive workouts immediately
 * No prompts - just restores everything
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

const restoreAllWorkouts = async () => {
  try {

    // Connect to database
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      "mongodb://localhost:27017/gym-entry-mern";
    await mongoose.connect(mongoUri);

    // Find all inactive workouts
    const inactiveWorkouts = await SharedWorkout.find({ isActive: false });

    if (inactiveWorkouts.length === 0) {
      await mongoose.disconnect();
      return;
    }


    // Display them
    inactiveWorkouts.forEach((workout, i) => {
    });


    // Bulk restore using updateMany
    const result = await SharedWorkout.updateMany(
      { isActive: false },
      {
        $set: {
          isActive: true,
          updatedAt: new Date(),
        },
      }
    );


    if (result.modifiedCount > 0) {
    }
  } catch (error) {
  } finally {
    await mongoose.disconnect();
  }
};

// Run the restoration
restoreAllWorkouts();
