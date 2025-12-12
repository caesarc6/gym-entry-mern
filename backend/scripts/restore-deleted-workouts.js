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

    // Connect to database
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      "mongodb://localhost:27017/gym-entry-mern";
    await mongoose.connect(mongoUri);

    // Find recently deleted workouts (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const deletedWorkouts = await SharedWorkout.find({
      isActive: false,
      updatedAt: { $gte: thirtyDaysAgo },
    }).sort({ updatedAt: -1 });

    if (deletedWorkouts.length === 0) {
      await mongoose.disconnect();
      rl.close();
      return;
    }


    deletedWorkouts.forEach((workout, index) => {
    });


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

    workoutsToRestore.forEach((w, i) => {
    });

    const confirm = await question("\nProceed with restoration? (yes/no): ");

    if (confirm.toLowerCase() !== "yes" && confirm.toLowerCase() !== "y") {
      await mongoose.disconnect();
      rl.close();
      return;
    }

    // Restore the workouts
    let restored = 0;

    for (const workout of workoutsToRestore) {
      try {
        await SharedWorkout.findByIdAndUpdate(workout._id, {
          isActive: true,
          updatedAt: new Date(),
        });
        restored++;
      } catch (error) {
      }
    }

  } catch (error) {
  } finally {
    await mongoose.disconnect();
    rl.close();
  }
};

// Run the restoration
restoreWorkouts();
