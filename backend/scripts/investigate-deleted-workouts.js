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
    console.log("🔍 Starting workout investigation...\n");

    // Connect to database
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      "mongodb://localhost:27017/gym-entry-mern";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to database\n");

    // 1. Check for workouts with missing or empty clientName
    console.log("=".repeat(60));
    console.log("📋 WORKOUTS AT RISK OF DELETION");
    console.log("=".repeat(60));

    const atRiskWorkouts = await SharedWorkout.find({
      $or: [
        { clientName: { $exists: false } },
        { clientName: null },
        { clientName: "" },
        { clientName: /^\s*$/ }, // Only whitespace
      ],
      isActive: true,
    }).sort({ createdAt: -1 });

    console.log(`Found ${atRiskWorkouts.length} workouts at risk:\n`);

    if (atRiskWorkouts.length > 0) {
      atRiskWorkouts.forEach((workout, index) => {
        console.log(`${index + 1}. Workout: "${workout.workoutName}"`);
        console.log(`   ID: ${workout._id}`);
        console.log(
          `   Creator: ${workout.creatorName} (${workout.creatorUid})`
        );
        console.log(`   Client Name: "${workout.clientName || "NONE"}"`);
        console.log(`   Created: ${workout.createdAt}`);
        console.log(`   Shares: ${workout.totalShares || 0}`);
        console.log("");
      });
    } else {
      console.log("✅ No workouts at risk found!\n");
    }

    // 2. Check for soft-deleted workouts (isActive: false)
    console.log("=".repeat(60));
    console.log("🗑️  SOFT-DELETED WORKOUTS (Recently)");
    console.log("=".repeat(60));

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const deletedWorkouts = await SharedWorkout.find({
      isActive: false,
      updatedAt: { $gte: thirtyDaysAgo },
    }).sort({ updatedAt: -1 });

    console.log(`Found ${deletedWorkouts.length} recently deleted workouts:\n`);

    if (deletedWorkouts.length > 0) {
      deletedWorkouts.forEach((workout, index) => {
        console.log(`${index + 1}. Workout: "${workout.workoutName}"`);
        console.log(`   ID: ${workout._id}`);
        console.log(
          `   Creator: ${workout.creatorName} (${workout.creatorUid})`
        );
        console.log(`   Client Name: "${workout.clientName || "NONE"}"`);
        console.log(`   Created: ${workout.createdAt}`);
        console.log(`   Deleted: ${workout.updatedAt}`);
        console.log(`   Had Shares: ${workout.totalShares || 0}`);
        console.log("");
      });
    } else {
      console.log("✅ No recently deleted workouts found!\n");
    }

    // 3. Check for orphaned workout assignments
    console.log("=".repeat(60));
    console.log("⚠️  ORPHANED WORKOUT ASSIGNMENTS");
    console.log("=".repeat(60));

    const allAssignments = await WorkoutAssignment.find({
      isVisible: true,
    }).populate("sharedWorkoutId");

    const orphanedAssignments = allAssignments.filter(
      (assignment) =>
        !assignment.sharedWorkoutId || !assignment.sharedWorkoutId.isActive
    );

    console.log(`Found ${orphanedAssignments.length} orphaned assignments:\n`);

    if (orphanedAssignments.length > 0) {
      orphanedAssignments.forEach((assignment, index) => {
        console.log(`${index + 1}. Assignment ID: ${assignment._id}`);
        console.log(`   Client: ${assignment.assignedToName}`);
        console.log(`   Label: "${assignment.customLabel}"`);
        console.log(`   Status: ${assignment.status}`);
        console.log(`   Assigned: ${assignment.createdAt}`);
        console.log(
          `   Workout Exists: ${
            assignment.sharedWorkoutId ? "Yes (but inactive)" : "No (deleted)"
          }`
        );
        console.log("");
      });
    } else {
      console.log("✅ No orphaned assignments found!\n");
    }

    // 4. Summary statistics
    console.log("=".repeat(60));
    console.log("📊 SUMMARY STATISTICS");
    console.log("=".repeat(60));

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

    console.log(`Total Active Workouts: ${totalActive}`);
    console.log(`Total Deleted Workouts: ${totalDeleted}`);
    console.log(`Active Workouts with Clients: ${totalWithClients}`);
    console.log(`Workouts at Risk: ${atRiskWorkouts.length}`);
    console.log(`Total Active Assignments: ${totalAssignments}`);
    console.log(`Orphaned Assignments: ${orphanedAssignments.length}`);
    console.log("");

    console.log("=".repeat(60));
    console.log("🔧 RECOMMENDATIONS");
    console.log("=".repeat(60));

    if (atRiskWorkouts.length > 0) {
      console.log("⚠️  WARNING: You have workouts at risk of deletion!");
      console.log(
        "   These workouts are missing a clientName and may be deleted"
      );
      console.log("   when the trainer dashboard loads.");
      console.log("");
    }

    if (deletedWorkouts.length > 0) {
      console.log(
        "💡 You can restore deleted workouts by setting isActive: true"
      );
      console.log(
        "   Use the restore script or update them manually in the database."
      );
      console.log("");
    }

    if (orphanedAssignments.length > 0) {
      console.log("⚠️  Orphaned assignments need attention!");
      console.log("   Consider cleaning up or reassigning them.");
      console.log("");
    }

    console.log("✅ Investigation complete!\n");
  } catch (error) {
    console.error("❌ Error during investigation:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from database");
  }
};

// Run the investigation
investigateWorkouts();
