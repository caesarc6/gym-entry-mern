/**
 * Migration controller for linking Firebase and Supabase accounts
 * 
 * This allows existing Firebase users to link their Supabase account
 * after they've signed up with Supabase using the same email.
 */

import { User } from "../models/user.model.js";
import Entry from "../models/entry.model.js";
import Workout from "../models/workout.model.js";
import WorkoutAssignment from "../models/workoutAssignment.model.js";
import SharedWorkout from "../models/sharedWorkout.model.js";
import WorkoutTemplate from "../models/workoutTemplate.model.js";
import { supabaseAdmin } from "../supabase/supabase.js";
import { verifyIdToken } from "../middleware/auth.js";

const migrateUserData = async (oldUid, newUid) => {
  const results = {};

  results.entries = await Entry.updateMany(
    { uid: oldUid },
    { $set: { uid: newUid } }
  );

  results.entryTrainer = await Entry.updateMany(
    { trainerUid: oldUid },
    { $set: { trainerUid: newUid } }
  );

  results.entryComments = await Entry.updateMany(
    { "comments.uid": oldUid },
    { $set: { "comments.$[comment].uid": newUid } },
    { arrayFilters: [{ "comment.uid": oldUid }] }
  );

  results.entryReplies = await Entry.updateMany(
    { "comments.replies.uid": oldUid },
    { $set: { "comments.$[].replies.$[reply].uid": newUid } },
    { arrayFilters: [{ "reply.uid": oldUid }] }
  );

  results.entryCommentLikes = await Entry.updateMany(
    { "comments.likes.uid": oldUid },
    { $set: { "comments.$[].likes.$[like].uid": newUid } },
    { arrayFilters: [{ "like.uid": oldUid }] }
  );

  results.workouts = await Workout.updateMany(
    { userId: oldUid },
    { $set: { userId: newUid } }
  );

  results.workoutAssignmentsTo = await WorkoutAssignment.updateMany(
    { assignedToUid: oldUid },
    { $set: { assignedToUid: newUid } }
  );

  results.workoutAssignmentsBy = await WorkoutAssignment.updateMany(
    { sharedByUid: oldUid },
    { $set: { sharedByUid: newUid } }
  );

  results.sharedWorkouts = await SharedWorkout.updateMany(
    { creatorUid: oldUid },
    { $set: { creatorUid: newUid } }
  );

  results.workoutTemplates = await WorkoutTemplate.updateMany(
    { creatorUid: oldUid },
    { $set: { creatorUid: newUid } }
  );

  return {
    entries: results.entries.modifiedCount || 0,
    entryTrainer: results.entryTrainer.modifiedCount || 0,
    entryComments: results.entryComments.modifiedCount || 0,
    entryReplies: results.entryReplies.modifiedCount || 0,
    entryCommentLikes: results.entryCommentLikes.modifiedCount || 0,
    workouts: results.workouts.modifiedCount || 0,
    workoutAssignmentsTo: results.workoutAssignmentsTo.modifiedCount || 0,
    workoutAssignmentsBy: results.workoutAssignmentsBy.modifiedCount || 0,
    sharedWorkouts: results.sharedWorkouts.modifiedCount || 0,
    workoutTemplates: results.workoutTemplates.modifiedCount || 0,
  };
};

/**
 * Link Firebase and Supabase accounts
 * 
 * This endpoint should be called by a user who:
 * 1. Already has a Firebase account
 * 2. Has just signed up with Supabase using the same email
 * 3. Wants to link both accounts
 * 
 * The user must be authenticated with Supabase (new auth)
 * and provide their Firebase UID to link
 */
export const linkFirebaseToSupabase = async (req, res) => {
  try {
    // User must be authenticated with Supabase
    if (req.user.authProvider !== "supabase") {
      return res.status(400).json({
        success: false,
        message: "You must be authenticated with Supabase to link accounts",
      });
    }

    const { firebaseUid } = req.body;
    const supabaseUid = req.user.supabaseUid || req.user.uid;
    const email = req.user.email;

    // Find user by Firebase UID or email
    const firebaseUser = firebaseUid
      ? await User.findOne({
          $or: [{ firebaseUid }, { uid: firebaseUid }, { email }],
        })
      : await User.findOne({ email });

    if (!firebaseUser) {
      return res.status(404).json({
        success: false,
        message: "Firebase account not found",
      });
    }

    // Check if email matches
    if (firebaseUser.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: "Email mismatch. Accounts must use the same email address.",
      });
    }

    // Check if Supabase account already exists
    const existingSupabaseUser = await User.findOne({
      $or: [
        { supabaseUid },
        { uid: supabaseUid }
      ]
    });

    if (existingSupabaseUser && existingSupabaseUser._id.toString() !== firebaseUser._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Supabase account is already linked to another user",
      });
    }

    const oldUid = firebaseUser.uid;

    // Link accounts by updating the Firebase user with Supabase UID
    // Preserve Firebase UID for reference
    const firebaseUidToPreserve = firebaseUser.firebaseUid || firebaseUser.uid;

    const updatedUser = await User.findOneAndUpdate(
      { _id: firebaseUser._id },
      {
        $set: {
          firebaseUid: firebaseUidToPreserve,
          supabaseUid,
          // Keep both UIDs, but update primary UID to Supabase for new auth
          uid: supabaseUid,
          authProvider: "supabase",
        },
      },
      { new: true }
    );

    const migrationCounts =
      oldUid && oldUid !== supabaseUid
        ? await migrateUserData(oldUid, supabaseUid)
        : {
            entries: 0,
            entryTrainer: 0,
            entryComments: 0,
            entryReplies: 0,
            entryCommentLikes: 0,
            workouts: 0,
            workoutAssignmentsTo: 0,
            workoutAssignmentsBy: 0,
            sharedWorkouts: 0,
            workoutTemplates: 0,
          };

    res.status(200).json({
      success: true,
      message: "Accounts linked successfully. All data has been migrated.",
      data: {
        uid: updatedUser.uid,
        firebaseUid: updatedUser.firebaseUid,
        supabaseUid: updatedUser.supabaseUid,
        authProvider: updatedUser.authProvider,
        migrationCounts,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to link accounts",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get migration status for current user
 */
export const getMigrationStatus = async (req, res) => {
  try {
    const { uid, authProvider } = req.user;

    const user = await User.findOne({
      $or: [
        { uid },
        { firebaseUid: uid },
        { supabaseUid: uid }
      ]
    }).select("uid firebaseUid supabaseUid authProvider email");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const hasFirebase = !!(user.firebaseUid || (user.authProvider === "firebase"));
    const hasSupabase = !!(user.supabaseUid || (user.authProvider === "supabase"));
    const isMigrated = hasFirebase && hasSupabase;

    res.status(200).json({
      success: true,
      data: {
        hasFirebase,
        hasSupabase,
        isMigrated,
        currentAuthProvider: authProvider,
        userAuthProvider: user.authProvider,
        firebaseUid: user.firebaseUid,
        supabaseUid: user.supabaseUid,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get migration status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
