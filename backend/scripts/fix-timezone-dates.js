/**
 * Migration script to fix timezone-affected dates in the database
 * This script corrects dates that were stored as UTC midnight when they should be local dates
 */

import mongoose from "mongoose";
import SharedWorkout from "../models/sharedWorkout.model.js";
import WorkoutAssignment from "../models/workoutAssignment.model.js";

const fixTimezoneDates = async () => {
  try {

    // Connect to database
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/gym-entry-mern"
    );

    // Fix SharedWorkout dates
    const sharedWorkouts = await SharedWorkout.find({});
    let fixedSharedWorkouts = 0;

    for (const workout of sharedWorkouts) {
      if (workout.createdAt) {
        const createdAt = new Date(workout.createdAt);

        // Check if this is a timezone-affected date (UTC midnight)
        if (
          createdAt.getUTCHours() === 0 &&
          createdAt.getUTCMinutes() === 0 &&
          createdAt.getUTCSeconds() === 0
        ) {
          // Extract the date part and create a new date in local timezone
          const year = createdAt.getUTCFullYear();
          const month = createdAt.getUTCMonth();
          const day = createdAt.getUTCDate();

          // Create a new date in local timezone
          const correctedDate = new Date(year, month, day);

          await SharedWorkout.findByIdAndUpdate(workout._id, {
            createdAt: correctedDate,
          });

          fixedSharedWorkouts++;
        }
      }
    }

    // Fix WorkoutAssignment dates
    const assignments = await WorkoutAssignment.find({});
    let fixedAssignments = 0;

    for (const assignment of assignments) {
      let needsUpdate = false;
      const updateData = {};

      if (assignment.targetDate) {
        const targetDate = new Date(assignment.targetDate);
        if (
          targetDate.getUTCHours() === 0 &&
          targetDate.getUTCMinutes() === 0 &&
          targetDate.getUTCSeconds() === 0
        ) {
          const year = targetDate.getUTCFullYear();
          const month = targetDate.getUTCMonth();
          const day = targetDate.getUTCDate();
          updateData.targetDate = new Date(year, month, day);
          needsUpdate = true;
        }
      }

      if (assignment.dueDate) {
        const dueDate = new Date(assignment.dueDate);
        if (
          dueDate.getUTCHours() === 0 &&
          dueDate.getUTCMinutes() === 0 &&
          dueDate.getUTCSeconds() === 0
        ) {
          const year = dueDate.getUTCFullYear();
          const month = dueDate.getUTCMonth();
          const day = dueDate.getUTCDate();
          updateData.dueDate = new Date(year, month, day);
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await WorkoutAssignment.findByIdAndUpdate(assignment._id, updateData);
        fixedAssignments++;
      }
    }

  } catch (error) {
  } finally {
    await mongoose.disconnect();
  }
};

// Run the migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixTimezoneDates();
}

export default fixTimezoneDates;
