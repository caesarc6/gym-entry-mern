/**
 * Migration script to remove unused fields from SharedWorkout documents
 * Removes: category, difficulty, estimatedDuration
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

const removeUnusedFields = async () => {
  try {

    // Connect to database
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      "mongodb://localhost:27017/gym-entry-mern";
    await mongoose.connect(mongoUri);

    // Check how many documents have these fields
    const workoutsWithFields = await SharedWorkout.find({
      $or: [
        { category: { $exists: true } },
        { difficulty: { $exists: true } },
        { estimatedDuration: { $exists: true } },
      ],
    });


    if (workoutsWithFields.length === 0) {
      await mongoose.disconnect();
      return;
    }

    // Show sample of what will be removed

    workoutsWithFields.slice(0, 5).forEach((workout, i) => {
      if (workout.category)
      if (workout.difficulty)
      if (workout.estimatedDuration)
    });

    if (workoutsWithFields.length > 5) {
    }


    // Remove the fields using updateMany with explicit filter
    const result = await SharedWorkout.collection.updateMany(
      {
        $or: [
          { category: { $exists: true } },
          { difficulty: { $exists: true } },
          { estimatedDuration: { $exists: true } },
        ],
      },
      {
        $unset: {
          category: 1,
          difficulty: 1,
          estimatedDuration: 1,
        },
      }
    );


    if (result.modifiedCount > 0) {
    }

    // Verify cleanup
    const remainingWithFields = await SharedWorkout.find({
      $or: [
        { category: { $exists: true } },
        { difficulty: { $exists: true } },
        { estimatedDuration: { $exists: true } },
      ],
    });

    if (remainingWithFields.length === 0) {
    } else {
    }
  } catch (error) {
  } finally {
    await mongoose.disconnect();
  }
};

// Run the cleanup
removeUnusedFields();
