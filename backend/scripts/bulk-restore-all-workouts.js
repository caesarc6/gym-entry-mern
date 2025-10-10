/**
 * Bulk restore ALL inactive workouts at once
 * This will set isActive: true for all workouts that are currently false
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

const bulkRestoreWorkouts = async () => {
  try {
    console.log("🔧 BULK WORKOUT RESTORATION SCRIPT");
    console.log("=".repeat(70));
    console.log(
      "⚠️  WARNING: This will restore ALL inactive workouts at once!"
    );
    console.log("=".repeat(70));
    console.log("");

    // Connect to database
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      "mongodb://localhost:27017/gym-entry-mern";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to database\n");

    // Find all inactive workouts
    const inactiveWorkouts = await SharedWorkout.find({ isActive: false }).sort(
      { updatedAt: -1 }
    );

    if (inactiveWorkouts.length === 0) {
      console.log(
        "✅ No inactive workouts found! All workouts are already active.\n"
      );
      await mongoose.disconnect();
      rl.close();
      return;
    }

    console.log(`Found ${inactiveWorkouts.length} inactive workout(s):\n`);
    console.log("=".repeat(70));

    // Group by creator
    const byCreator = {};
    inactiveWorkouts.forEach((workout) => {
      const creator = workout.creatorName || "Unknown";
      if (!byCreator[creator]) byCreator[creator] = [];
      byCreator[creator].push(workout);
    });

    // Display summary
    Object.keys(byCreator).forEach((creator) => {
      console.log(`\n${creator}: ${byCreator[creator].length} workout(s)`);
      byCreator[creator].slice(0, 10).forEach((workout, i) => {
        console.log(
          `   ${i + 1}. "${workout.workoutName}" - Client: ${
            workout.clientName || "NONE"
          }`
        );
        console.log(
          `      Created: ${
            workout.createdAt?.toISOString().split("T")[0] || "Unknown"
          }`
        );
      });
      if (byCreator[creator].length > 10) {
        console.log(`   ... and ${byCreator[creator].length - 10} more`);
      }
    });

    console.log("\n" + "=".repeat(70));
    console.log("\n📝 RESTORATION OPTIONS:");
    console.log("   1. Restore ALL workouts");
    console.log("   2. Restore only workouts WITH client names");
    console.log("   3. Restore only workouts WITHOUT client names");
    console.log("   4. Cancel");

    const choice = await question("\nEnter your choice (1-4): ");

    let workoutsToRestore = [];
    let description = "";

    switch (choice.trim()) {
      case "1":
        workoutsToRestore = inactiveWorkouts;
        description = "ALL inactive workouts";
        break;

      case "2":
        workoutsToRestore = inactiveWorkouts.filter(
          (w) => w.clientName && w.clientName.trim()
        );
        description = "workouts WITH client names";
        break;

      case "3":
        workoutsToRestore = inactiveWorkouts.filter(
          (w) => !w.clientName || !w.clientName.trim()
        );
        description = "workouts WITHOUT client names";
        break;

      case "4":
        console.log("\n❌ Restoration cancelled\n");
        await mongoose.disconnect();
        rl.close();
        return;

      default:
        console.log("\n❌ Invalid choice\n");
        await mongoose.disconnect();
        rl.close();
        return;
    }

    if (workoutsToRestore.length === 0) {
      console.log("\n⚠️  No workouts match your selection\n");
      await mongoose.disconnect();
      rl.close();
      return;
    }

    console.log(
      `\n📊 About to restore ${workoutsToRestore.length} ${description}`
    );
    console.log("=".repeat(70));

    const confirm = await question(
      `\n⚠️  Type 'RESTORE' to confirm (or anything else to cancel): `
    );

    if (confirm !== "RESTORE") {
      console.log("\n❌ Restoration cancelled\n");
      await mongoose.disconnect();
      rl.close();
      return;
    }

    // Bulk restore using updateMany
    console.log("\n🔄 Restoring workouts...");

    const workoutIds = workoutsToRestore.map((w) => w._id);

    const result = await SharedWorkout.updateMany(
      { _id: { $in: workoutIds } },
      {
        $set: {
          isActive: true,
          updatedAt: new Date(),
        },
      }
    );

    console.log(`\n✅ Restoration complete!`);
    console.log(`   Modified: ${result.modifiedCount} workout(s)`);
    console.log(`   Matched: ${result.matchedCount} workout(s)`);

    if (result.modifiedCount > 0) {
      console.log(
        "\n🎉 SUCCESS! Your workouts should now appear in the frontend."
      );
      console.log("   Refresh your trainer dashboard to see them.");
    }

    console.log("\n" + "=".repeat(70));
    console.log("📋 RESTORED WORKOUTS:");
    console.log("=".repeat(70));

    workoutsToRestore.slice(0, 20).forEach((workout, i) => {
      console.log(
        `${i + 1}. ${workout.workoutName} - Client: ${
          workout.clientName || "NONE"
        }`
      );
    });

    if (workoutsToRestore.length > 20) {
      console.log(`... and ${workoutsToRestore.length - 20} more`);
    }

    console.log("\n");
  } catch (error) {
    console.error("❌ Error during bulk restoration:", error);
  } finally {
    await mongoose.disconnect();
    rl.close();
    console.log("Disconnected from database");
  }
};

// Run the bulk restoration
bulkRestoreWorkouts();
