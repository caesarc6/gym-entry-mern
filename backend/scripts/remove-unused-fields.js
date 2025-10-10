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
    console.log("🔧 REMOVING UNUSED FIELDS FROM DATABASE\n");

    // Connect to database
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      "mongodb://localhost:27017/gym-entry-mern";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to database\n");

    // Check how many documents have these fields
    const workoutsWithFields = await SharedWorkout.find({
      $or: [
        { category: { $exists: true } },
        { difficulty: { $exists: true } },
        { estimatedDuration: { $exists: true } },
      ],
    });

    console.log(
      `Found ${workoutsWithFields.length} workout(s) with unused fields\n`
    );

    if (workoutsWithFields.length === 0) {
      console.log(
        "✅ No workouts found with unused fields. Nothing to clean up!\n"
      );
      await mongoose.disconnect();
      return;
    }

    // Show sample of what will be removed
    console.log("=".repeat(70));
    console.log("📋 SAMPLE OF FIELDS TO BE REMOVED:");
    console.log("=".repeat(70));

    workoutsWithFields.slice(0, 5).forEach((workout, i) => {
      console.log(
        `\n${i + 1}. "${workout.workoutName}" - Client: ${
          workout.clientName || "NONE"
        }`
      );
      if (workout.category)
        console.log(`   ❌ category: ${workout.category} (will be removed)`);
      if (workout.difficulty)
        console.log(
          `   ❌ difficulty: ${workout.difficulty} (will be removed)`
        );
      if (workout.estimatedDuration)
        console.log(
          `   ❌ estimatedDuration: ${workout.estimatedDuration} (will be removed)`
        );
    });

    if (workoutsWithFields.length > 5) {
      console.log(`\n... and ${workoutsWithFields.length - 5} more workout(s)`);
    }

    console.log("\n" + "=".repeat(70));
    console.log("🗑️  REMOVING UNUSED FIELDS...\n");

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

    console.log("✅ CLEANUP COMPLETE!\n");
    console.log(`   Documents checked: ${result.matchedCount}`);
    console.log(`   Documents modified: ${result.modifiedCount}`);

    if (result.modifiedCount > 0) {
      console.log(
        "\n🎉 SUCCESS! Unused fields have been removed from the database."
      );
      console.log("   Your workouts are now cleaner and more streamlined.\n");
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
      console.log("✅ Verification: All unused fields successfully removed!\n");
    } else {
      console.log(
        `⚠️  Warning: ${remainingWithFields.length} documents still have unused fields\n`
      );
    }
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from database");
  }
};

// Run the cleanup
removeUnusedFields();
