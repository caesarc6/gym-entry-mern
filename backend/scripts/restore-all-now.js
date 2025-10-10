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
    console.log("🔧 RESTORING ALL INACTIVE WORKOUTS\n");

    // Connect to database
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      "mongodb://localhost:27017/gym-entry-mern";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to database\n");

    // Find all inactive workouts
    const inactiveWorkouts = await SharedWorkout.find({ isActive: false });

    if (inactiveWorkouts.length === 0) {
      console.log(
        "✅ No inactive workouts found! All workouts are already active.\n"
      );
      await mongoose.disconnect();
      return;
    }

    console.log(`Found ${inactiveWorkouts.length} inactive workout(s):\n`);

    // Display them
    inactiveWorkouts.forEach((workout, i) => {
      console.log(
        `${i + 1}. "${workout.workoutName}" - Client: ${
          workout.clientName || "NONE"
        }`
      );
    });

    console.log("\n" + "=".repeat(70));
    console.log("🔄 Restoring all workouts...\n");

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

    console.log("✅ RESTORATION COMPLETE!\n");
    console.log(`   Modified: ${result.modifiedCount} workout(s)`);
    console.log(`   Matched: ${result.matchedCount} workout(s)`);

    if (result.modifiedCount > 0) {
      console.log(
        "\n🎉 SUCCESS! Your workouts should now appear in the frontend."
      );
      console.log("   Refresh your trainer dashboard to see them.\n");
    }
  } catch (error) {
    console.error("❌ Error during restoration:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from database");
  }
};

// Run the restoration
restoreAllWorkouts();
