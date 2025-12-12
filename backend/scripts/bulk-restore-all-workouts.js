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

    // Connect to database
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      "mongodb://localhost:27017/gym-entry-mern";
    await mongoose.connect(mongoUri);

    // Find all inactive workouts
    const inactiveWorkouts = await SharedWorkout.find({ isActive: false }).sort(
      { updatedAt: -1 }
    );

    if (inactiveWorkouts.length === 0) {
      await mongoose.disconnect();
      rl.close();
      return;
    }


    // Group by creator
    const byCreator = {};
    inactiveWorkouts.forEach((workout) => {
      const creator = workout.creatorName || "Unknown";
      if (!byCreator[creator]) byCreator[creator] = [];
      byCreator[creator].push(workout);
    });

    // Display summary
    Object.keys(byCreator).forEach((creator) => {
      byCreator[creator].slice(0, 10).forEach((workout, i) => {
      });
      if (byCreator[creator].length > 10) {
      }
    });


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
        await mongoose.disconnect();
        rl.close();
        return;

      default:
        await mongoose.disconnect();
        rl.close();
        return;
    }

    if (workoutsToRestore.length === 0) {
      await mongoose.disconnect();
      rl.close();
      return;
    }


    const confirm = await question(
      `\n⚠️  Type 'RESTORE' to confirm (or anything else to cancel): `
    );

    if (confirm !== "RESTORE") {
      await mongoose.disconnect();
      rl.close();
      return;
    }

    // Bulk restore using updateMany

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


    if (result.modifiedCount > 0) {
    }


    workoutsToRestore.slice(0, 20).forEach((workout, i) => {
    });

    if (workoutsToRestore.length > 20) {
    }

  } catch (error) {
  } finally {
    await mongoose.disconnect();
    rl.close();
  }
};

// Run the bulk restoration
bulkRestoreWorkouts();
