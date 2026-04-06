/**
 * Replace every occurrence of oldUid with newUid across app collections.
 * (entries, shared workouts, workout templates, assignments, nested comment uids, etc.)
 */
import Entry from "../../models/entry.model.js";
import Workout from "../../models/workout.model.js";
import WorkoutAssignment from "../../models/workoutAssignment.model.js";
import SharedWorkout from "../../models/sharedWorkout.model.js";
import WorkoutTemplate from "../../models/workoutTemplate.model.js";

export const migrateUidStrings = async (oldUid, newUid) => {
  if (!oldUid || !newUid || oldUid === newUid) {
    throw new Error("migrateUidStrings: oldUid and newUid must be non-empty and different");
  }

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

  /** SharedWorkout collection (e.g. creatorUid: "jcHPb...") */
  results.sharedWorkouts = await SharedWorkout.updateMany(
    { creatorUid: oldUid },
    { $set: { creatorUid: newUid } }
  );

  results.workoutTemplates = await WorkoutTemplate.updateMany(
    { creatorUid: oldUid },
    { $set: { creatorUid: newUid } }
  );

  const mod = (r) => r.modifiedCount ?? r.nModified ?? 0;

  return {
    entries: mod(results.entries),
    entryTrainer: mod(results.entryTrainer),
    entryComments: mod(results.entryComments),
    entryReplies: mod(results.entryReplies),
    entryCommentLikes: mod(results.entryCommentLikes),
    workouts: mod(results.workouts),
    workoutAssignmentsTo: mod(results.workoutAssignmentsTo),
    workoutAssignmentsBy: mod(results.workoutAssignmentsBy),
    sharedWorkouts: mod(results.sharedWorkouts),
    workoutTemplates: mod(results.workoutTemplates),
  };
};
