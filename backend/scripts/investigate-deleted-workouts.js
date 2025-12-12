/**
 * Script to investigate deleted workouts and check for workouts at risk of deletion
 * This helps identify what workouts might have been deleted and which ones are at risk
 */

import mongoose from "mongoose";
import SharedWorkout from "../models/sharedWorkout.model.js";
import WorkoutAssignment from "../models/workoutAssignment.model.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

const investigateWorkouts = async () => {
  try {

    // Connect to database
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      "mongodb://localhost:27017/gym-entry-mern";
    await mongoose.connect(mongoUri);

    // 1. Check for workouts with missing or empty clientName

    const atRiskWorkouts = await SharedWorkout.find({
      $or: [
        { clientName: { $exists: false } },
        { clientName: null },
        { clientName: "" },
        { clientName: /^\s*$/ }, // Only whitespace
      ],
      isActive: true,
    }).sort({ createdAt: -1 });


    if (atRiskWorkouts.length > 0) {
      atRiskWorkouts.forEach((workout, index) => {
      });
    } else {
    }

    // 2. Check for soft-deleted workouts (isActive: false)

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const deletedWorkouts = await SharedWorkout.find({
      isActive: false,
      updatedAt: { $gte: thirtyDaysAgo },
    }).sort({ updatedAt: -1 });


    if (deletedWorkouts.length > 0) {
      deletedWorkouts.forEach((workout, index) => {
      });
    } else {
    }

    // 3. Check for orphaned workout assignments

    const allAssignments = await WorkoutAssignment.find({
      isVisible: true,
    }).populate("sharedWorkoutId");

    const orphanedAssignments = allAssignments.filter(
      (assignment) =>
        !assignment.sharedWorkoutId || !assignment.sharedWorkoutId.isActive
    );


    if (orphanedAssignments.length > 0) {
      orphanedAssignments.forEach((assignment, index) => {
      });
    } else {
    }

    // 4. Summary statistics

    const totalActive = await SharedWorkout.countDocuments({ isActive: true });
    const totalDeleted = await SharedWorkout.countDocuments({
      isActive: false,
    });
    const totalWithClients = await SharedWorkout.countDocuments({
      isActive: true,
      clientName: { $exists: true, $ne: "", $not: /^\s*$/ },
    });
    const totalAssignments = await WorkoutAssignment.countDocuments({
      isVisible: true,
    });



    if (atRiskWorkouts.length > 0) {
    }

    if (deletedWorkouts.length > 0) {
    }

    if (orphanedAssignments.length > 0) {
    }

  } catch (error) {
  } finally {
    await mongoose.disconnect();
  }
};

// Run the investigation
investigateWorkouts();
