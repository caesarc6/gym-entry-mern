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
    console.log("🔍 Checking workout status in database...\n");

    // Connect to database
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      "mongodb://localhost:27017/gym-entry-mern";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to database\n");

    // Get all workouts (active and inactive)
    const allWorkouts = await SharedWorkout.find({}).sort({ createdAt: -1 });

    const activeWorkouts = allWorkouts.filter((w) => w.isActive === true);
    const inactiveWorkouts = allWorkouts.filter((w) => w.isActive === false);

    console.log("=".repeat(70));
    console.log("📊 WORKOUT STATUS SUMMARY");
    console.log("=".repeat(70));
    console.log(`Total Workouts in Database: ${allWorkouts.length}`);
    console.log(
      `✅ Active (isActive: true):  ${activeWorkouts.length} - VISIBLE in frontend`
    );
    console.log(
      `❌ Inactive (isActive: false): ${inactiveWorkouts.length} - HIDDEN from frontend`
    );
    console.log("=".repeat(70));
    console.log("");

    if (inactiveWorkouts.length > 0) {
      console.log("🗑️  INACTIVE WORKOUTS (Not showing in frontend):");
      console.log("=".repeat(70));

      inactiveWorkouts.forEach((workout, index) => {
        console.log(`\n${index + 1}. "${workout.workoutName}"`);
        console.log(`   ID: ${workout._id}`);
        console.log(
          `   Creator: ${workout.creatorName} (${workout.creatorUid})`
        );
        console.log(`   Client: ${workout.clientName || "NONE"}`);
        console.log(
          `   Created: ${
            workout.createdAt?.toISOString().split("T")[0] || "Unknown"
          }`
        );
        console.log(
          `   Updated: ${
            workout.updatedAt?.toISOString().split("T")[0] || "Unknown"
          }`
        );
        console.log(`   Exercises: ${workout.exercises?.length || 0}`);
        console.log(`   Status: ❌ isActive = false (HIDDEN)`);
      });

      console.log("\n" + "=".repeat(70));
      console.log("💡 TO RESTORE THESE WORKOUTS:");
      console.log("   Run: node scripts/restore-deleted-workouts.js");
      console.log("   Or: node scripts/bulk-restore-all-workouts.js");
      console.log("=".repeat(70));
    } else {
      console.log("✅ All workouts are active! Nothing is hidden.\n");
    }

    if (activeWorkouts.length > 0) {
      console.log("\n✅ ACTIVE WORKOUTS (Showing in frontend):");
      console.log("=".repeat(70));

      // Group by creator
      const byCreator = {};
      activeWorkouts.forEach((workout) => {
        const creator = workout.creatorName || "Unknown";
        if (!byCreator[creator]) byCreator[creator] = [];
        byCreator[creator].push(workout);
      });

      Object.keys(byCreator).forEach((creator) => {
        console.log(`\n${creator}: ${byCreator[creator].length} workout(s)`);
        byCreator[creator].slice(0, 5).forEach((workout, i) => {
          console.log(
            `   ${i + 1}. ${workout.workoutName} - Client: ${
              workout.clientName || "NONE"
            }`
          );
        });
        if (byCreator[creator].length > 5) {
          console.log(`   ... and ${byCreator[creator].length - 5} more`);
        }
      });
    }

    console.log("\n" + "=".repeat(70));
    console.log("🎯 NEXT STEPS:");
    console.log("=".repeat(70));

    if (inactiveWorkouts.length > 0) {
      console.log("⚠️  You have hidden workouts that need to be restored!");
      console.log("\nOption 1: Restore ALL inactive workouts at once");
      console.log("   → node scripts/bulk-restore-all-workouts.js");
      console.log("\nOption 2: Choose which workouts to restore");
      console.log("   → node scripts/restore-deleted-workouts.js");
      console.log("\nOption 3: Restore manually by ID (in MongoDB shell)");
      console.log("   → db.sharedworkouts.updateOne(");
      console.log("       { _id: ObjectId('WORKOUT_ID') },");
      console.log("       { $set: { isActive: true } }");
      console.log("     )");
    } else {
      console.log("✅ All workouts are active and visible in the frontend!");
    }

    console.log("\n");
  } catch (error) {
    console.error("❌ Error checking workout status:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from database");
  }
};

// Run the check
checkWorkoutStatus();
