/**
 * Script to restore accidentally deleted workouts
 * This will reactivate workouts that were soft-deleted (isActive: false)
 */

import mongoose from "mongoose";
import SharedWorkout from "../models/sharedWorkout.model.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

const restoreWorkouts = async () => {
  try {
    console.log("🔧 Workout Restoration Script\n");

    // Connect to database
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      "mongodb://localhost:27017/gym-entry-mern";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to database\n");

    // Find recently deleted workouts (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const deletedWorkouts = await SharedWorkout.find({
      isActive: false,
      updatedAt: { $gte: thirtyDaysAgo },
    }).sort({ updatedAt: -1 });

    if (deletedWorkouts.length === 0) {
      console.log("✅ No recently deleted workouts found!\n");
      await mongoose.disconnect();
      rl.close();
      return;
    }

    console.log(
      `Found ${deletedWorkouts.length} recently deleted workout(s):\n`
    );
    console.log("=".repeat(60));

    deletedWorkouts.forEach((workout, index) => {
      console.log(`\n${index + 1}. "${workout.workoutName}"`);
      console.log(`   ID: ${workout._id}`);
      console.log(`   Creator: ${workout.creatorName} (${workout.creatorUid})`);
      console.log(`   Client: "${workout.clientName || "NONE"}"`);
      console.log(
        `   Created: ${workout.createdAt.toISOString().split("T")[0]}`
      );
      console.log(
        `   Deleted: ${workout.updatedAt.toISOString().split("T")[0]}`
      );
      console.log(`   Exercises: ${workout.exercises?.length || 0}`);
    });

    console.log("\n" + "=".repeat(60));
    console.log("\nRestore Options:");
    console.log("1. Restore ALL deleted workouts");
    console.log("2. Restore specific workouts by ID");
    console.log("3. Restore only workouts with clients");
    console.log("4. Cancel");

    const choice = await question("\nEnter your choice (1-4): ");

    let workoutsToRestore = [];

    switch (choice.trim()) {
      case "1":
        workoutsToRestore = deletedWorkouts;
        break;

      case "2":
        const ids = await question("Enter workout IDs (comma-separated): ");
        const idList = ids.split(",").map((id) => id.trim());
        workoutsToRestore = deletedWorkouts.filter((w) =>
          idList.includes(w._id.toString())
        );
        break;

      case "3":
        workoutsToRestore = deletedWorkouts.filter(
          (w) => w.clientName && w.clientName.trim()
        );
        break;

      case "4":
        console.log("❌ Restoration cancelled");
        await mongoose.disconnect();
        rl.close();
        return;

      default:
        console.log("❌ Invalid choice");
        await mongoose.disconnect();
        rl.close();
        return;
    }

    if (workoutsToRestore.length === 0) {
      console.log("⚠️  No workouts match your selection");
      await mongoose.disconnect();
      rl.close();
      return;
    }

    console.log(
      `\n📝 About to restore ${workoutsToRestore.length} workout(s):`
    );
    workoutsToRestore.forEach((w, i) => {
      console.log(`   ${i + 1}. ${w.workoutName} (${w._id})`);
    });

    const confirm = await question("\nProceed with restoration? (yes/no): ");

    if (confirm.toLowerCase() !== "yes" && confirm.toLowerCase() !== "y") {
      console.log("❌ Restoration cancelled");
      await mongoose.disconnect();
      rl.close();
      return;
    }

    // Restore the workouts
    console.log("\n🔄 Restoring workouts...");
    let restored = 0;

    for (const workout of workoutsToRestore) {
      try {
        await SharedWorkout.findByIdAndUpdate(workout._id, {
          isActive: true,
          updatedAt: new Date(),
        });
        console.log(`✅ Restored: ${workout.workoutName}`);
        restored++;
      } catch (error) {
        console.error(
          `❌ Failed to restore ${workout.workoutName}:`,
          error.message
        );
      }
    }

    console.log(
      `\n✅ Restoration complete! Restored ${restored} out of ${workoutsToRestore.length} workouts.\n`
    );
  } catch (error) {
    console.error("❌ Error during restoration:", error);
  } finally {
    await mongoose.disconnect();
    rl.close();
    console.log("Disconnected from database");
  }
};

// Run the restoration
restoreWorkouts();
