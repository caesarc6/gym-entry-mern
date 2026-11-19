import Workout from "../models/workout.model.js";
import Entry from "../models/entry.model.js";
import { User } from "../models/user.model.js";
import {
  parseWorkoutDescription,
  parseWorkoutTitle,
  calculateTotalVolume,
  extractPRs,
} from "../utils/workoutParser.js";

const exerciseNameKey = (name) => String(name || "").trim().toLowerCase();

const timeframeStart = (timeframe) => {
  const now = new Date();
  const days = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 }[timeframe] || 30;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
};

/**
 * Auth tokens may be firebaseUid/supabaseUid while Workout.userId is stored as
 * the account's canonical `uid`. Resolve every linked id so Analyze reads the
 * same rows create/edit sync writes.
 */
async function resolveWorkoutUserIds(authUid) {
  if (!authUid) return [];
  const ids = new Set([authUid]);
  const user = await User.findOne({
    $or: [
      { uid: authUid },
      { firebaseUid: authUid },
      { supabaseUid: authUid },
    ],
  })
    .select("uid firebaseUid supabaseUid")
    .lean();
  if (user?.uid) ids.add(user.uid);
  if (user?.firebaseUid) ids.add(user.firebaseUid);
  if (user?.supabaseUid) ids.add(user.supabaseUid);
  return [...ids];
}

const workoutUserIdFilter = (userIds) =>
  userIds.length <= 1 ? userIds[0] : { $in: userIds };

/** Fill nameKey on older workout rows so chart lookups can use the index. */
async function ensureExerciseNameKeys(userIds) {
  const ids = (Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean);
  if (ids.length === 0) return;
  await Workout.updateMany(
    {
      userId: workoutUserIdFilter(ids),
      exercises: { $elemMatch: { nameKey: { $exists: false } } },
    },
    [
      {
        $set: {
          exercises: {
            $map: {
              input: { $ifNull: ["$exercises", []] },
              as: "exercise",
              in: {
                $mergeObjects: [
                  "$$exercise",
                  {
                    nameKey: {
                      $toLower: {
                        $trim: {
                          input: { $ifNull: ["$$exercise.name", ""] },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    ]
  );
}

/**
 * Process and store workout data from an entry
 */
export const processWorkoutEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    const { uid } = req.user;

    // Find the entry
    const entry = await Entry.findById(entryId);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Entry not found",
      });
    }

    // Check if user owns the entry
    if (entry.uid !== uid) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to process this entry",
      });
    }

    // Parse workout data
    const exercises = parseWorkoutDescription(entry.description);
    const { split, gym } = parseWorkoutTitle(entry.name);
    const totalVolume = calculateTotalVolume(exercises);

    if (exercises.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid exercises found in description",
      });
    }

    // Check if workout already exists
    const existingWorkout = await Workout.findOne({ entryId });
    if (existingWorkout) {
      return res.status(400).json({
        success: false,
        message: "Workout data already processed for this entry",
      });
    }

    // Create workout record
    const workout = new Workout({
      entryId,
      userId: uid,
      title: entry.name,
      split: split || undefined,
      gym: gym || undefined,
      exercises,
      totalVolume,
      workoutDate: entry.createdAt,
    });

    await workout.save();

    res.status(201).json({
      success: true,
      message: "Workout data processed successfully",
      data: workout,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Create or replace the workout row for a saved post.
 * Skips posts that do not parse as a workout. Failures stay in the caller.
 */
export async function syncWorkoutFromEntry(entry, userId) {
  if (!entry?._id || !userId) return;

  const plain =
    typeof entry.toObject === "function" ? entry.toObject() : entry;
  // Prefer the account's canonical uid so Analyze queries stay aligned even when
  // the caller passed a secondary firebaseUid/supabaseUid.
  const account = await User.findOne({
    $or: [
      { uid: userId },
      { firebaseUid: userId },
      { supabaseUid: userId },
    ],
  })
    .select("uid")
    .lean();
  const ownerUserId = account?.uid || userId;

  const exercises = parseWorkoutDescription(plain.description || "");
  if (exercises.length === 0) {
    await Workout.deleteOne({ entryId: plain._id });
    return;
  }

  const { split, gym } = parseWorkoutTitle(plain.name || "");
  const totalVolume = calculateTotalVolume(exercises);
  const fields = {
    userId: ownerUserId,
    title: plain.name || "Workout",
    split: split || undefined,
    // Persist short gym tags ("Pg"); use undefined (not null) when absent so
    // Mongoose String setters are not called with a null prior/next pair oddly.
    gym: gym || undefined,
    exercises,
    totalVolume,
    workoutDate: plain.createdAt || new Date(),
    updatedAt: new Date(),
  };

  try {
    await Workout.findOneAndUpdate(
      { entryId: plain._id },
      {
        $set: fields,
        $setOnInsert: {
          entryId: plain._id,
          createdAt: plain.createdAt || new Date(),
        },
      },
      { upsert: true, new: true, runValidators: true },
    );
  } catch (error) {
    // Concurrent upserts can still race the unique entryId index once.
    if (error?.code === 11000) {
      await Workout.findOneAndUpdate(
        { entryId: plain._id },
        { $set: fields },
        { new: true, runValidators: true },
      );
      return;
    }
    throw error;
  }
}

/**
 * Get all workouts for the current user
 */
export const getAllWorkouts = async (req, res) => {
  try {
    const { uid } = req.user;
    const userIds = await resolveWorkoutUserIds(uid);
    if (userIds.length === 0) {
      return res.status(200).json([]);
    }

    const workouts = await Workout.find({
      userId: workoutUserIdFilter(userIds),
    })
      .select("entryId workoutDate title split gym totalVolume")
      .sort({ workoutDate: -1 })
      .limit(500)
      .lean();

    res.setHeader(
      "Cache-Control",
      "private, max-age=30, stale-while-revalidate=60",
    );
    res.status(200).json(workouts);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get workout analytics for a user
 */
export const getWorkoutAnalytics = async (req, res) => {
  try {
    const { uid } = req.user;
    const { timeframe = "30d", exercise } = req.query;
    const startDate = timeframeStart(timeframe);
    const nameKey = exerciseNameKey(exercise);
    const userIds = await resolveWorkoutUserIds(uid);
    if (userIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          totalWorkouts: 0,
          totalVolume: 0,
          averageVolumePerWorkout: 0,
          exercises: {},
          splits: {},
          gyms: {},
          recentPRs: {},
        },
      });
    }

    if (nameKey) await ensureExerciseNameKeys(userIds);

    const query = {
      userId: workoutUserIdFilter(userIds),
      workoutDate: { $gte: startDate },
    };

    if (nameKey) {
      query["exercises.nameKey"] = nameKey;
    }

    const workouts = await Workout.find(query)
      .sort({ workoutDate: -1 })
      .select(
        "workoutDate split gym totalVolume exercises.name exercises.maxWeight exercises.totalReps exercises.totalVolume"
      )
      .lean();

    // Calculate analytics
    const analytics = {
      totalWorkouts: workouts.length,
      totalVolume: workouts.reduce((sum, w) => sum + w.totalVolume, 0),
      averageVolumePerWorkout:
        workouts.length > 0
          ? workouts.reduce((sum, w) => sum + w.totalVolume, 0) /
            workouts.length
          : 0,
      exercises: {},
      splits: {},
      gyms: {},
      recentPRs: {},
    };

    // Process each workout
    workouts.forEach((workout) => {
      // Track splits
      if (workout.split) {
        analytics.splits[workout.split] =
          (analytics.splits[workout.split] || 0) + 1;
      }

      // Track gyms
      if (workout.gym) {
        analytics.gyms[workout.gym] = (analytics.gyms[workout.gym] || 0) + 1;
      }

      // Process exercises
      workout.exercises.forEach((exercise) => {
        const exerciseName = exercise.name;

        if (!analytics.exercises[exerciseName]) {
          analytics.exercises[exerciseName] = {
            totalWorkouts: 0,
            totalVolume: 0,
            maxWeight: 0,
            maxReps: 0,
            maxVolume: 0,
            history: [],
          };
        }

        const exerciseStats = analytics.exercises[exerciseName];
        exerciseStats.totalWorkouts++;
        exerciseStats.totalVolume += exercise.totalVolume;

        if (exercise.maxWeight > exerciseStats.maxWeight) {
          exerciseStats.maxWeight = exercise.maxWeight;
        }

        if (exercise.totalReps > exerciseStats.maxReps) {
          exerciseStats.maxReps = exercise.totalReps;
        }

        if (exercise.totalVolume > exerciseStats.maxVolume) {
          exerciseStats.maxVolume = exercise.totalVolume;
        }

        // Add to history
        exerciseStats.history.push({
          date: workout.workoutDate,
          weight: exercise.maxWeight,
          reps: exercise.totalReps,
          volume: exercise.totalVolume,
          workoutId: workout._id,
        });
      });
    });

    // Sort exercise history by date
    Object.values(analytics.exercises).forEach((exercise) => {
      exercise.history.sort((a, b) => new Date(a.date) - new Date(b.date));
    });

    res.setHeader(
      "Cache-Control",
      "private, max-age=30, stale-while-revalidate=60",
    );
    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get exercise progress over time
 */
export const getExerciseProgress = async (req, res) => {
  try {
    const { uid } = req.user;
    const { exercise, timeframe = "30d" } = req.query;
    const nameKey = exerciseNameKey(exercise);

    if (!nameKey) {
      return res.status(400).json({
        success: false,
        message: "Exercise name is required",
      });
    }

    const userIds = await resolveWorkoutUserIds(uid);
    if (userIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          exercise,
          dataPoints: [],
          maxWeight: 0,
          maxVolume: 0,
          maxReps: 0,
        },
      });
    }

    const startDate = timeframeStart(timeframe);
    await ensureExerciseNameKeys(userIds);

    const rows = await Workout.aggregate([
      {
        $match: {
          userId: workoutUserIdFilter(userIds),
          workoutDate: { $gte: startDate },
          "exercises.nameKey": nameKey,
        },
      },
      { $unwind: "$exercises" },
      { $match: { "exercises.nameKey": nameKey } },
      { $sort: { workoutDate: 1 } },
      {
        $project: {
          _id: 0,
          name: "$exercises.name",
          date: "$workoutDate",
          weight: "$exercises.maxWeight",
          reps: "$exercises.totalReps",
          volume: "$exercises.totalVolume",
          sets: {
            $cond: [
              { $isArray: "$exercises.sets" },
              { $size: "$exercises.sets" },
              0,
            ],
          },
          workoutId: "$_id",
        },
      },
    ]);

    const progress = {
      exercise: rows[0]?.name || exercise,
      dataPoints: rows.map(({ date, weight, reps, volume, sets, workoutId }) => ({
        date,
        weight,
        reps,
        volume,
        sets,
        workoutId,
      })),
      maxWeight: 0,
      maxVolume: 0,
      maxReps: 0,
    };

    progress.dataPoints.forEach((point) => {
      if (point.weight > progress.maxWeight) progress.maxWeight = point.weight;
      if (point.volume > progress.maxVolume) progress.maxVolume = point.volume;
      if (point.reps > progress.maxReps) progress.maxReps = point.reps;
    });

    res.setHeader(
      "Cache-Control",
      "private, max-age=30, stale-while-revalidate=60",
    );
    res.status(200).json({
      success: true,
      data: progress,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get personal records for a user
 */
export const getPersonalRecords = async (req, res) => {
  try {
    const { uid } = req.user;
    const userIds = await resolveWorkoutUserIds(uid);
    if (userIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {},
      });
    }

    const rows = await Workout.aggregate([
      { $match: { userId: workoutUserIdFilter(userIds) } },
      { $sort: { workoutDate: -1 } },
      { $unwind: "$exercises" },
      {
        $group: {
          _id: "$exercises.name",
          latest: {
            $first: {
              value: "$exercises.maxWeight",
              date: "$workoutDate",
              workoutId: "$_id",
            },
          },
          maxWeight: {
            $top: {
              sortBy: { "exercises.maxWeight": -1, workoutDate: -1 },
              output: {
                value: "$exercises.maxWeight",
                date: "$workoutDate",
                workoutId: "$_id",
              },
            },
          },
          maxVolume: {
            $top: {
              sortBy: { "exercises.totalVolume": -1, workoutDate: -1 },
              output: {
                value: "$exercises.totalVolume",
                date: "$workoutDate",
                workoutId: "$_id",
              },
            },
          },
          maxReps: {
            $top: {
              sortBy: { "exercises.totalReps": -1, workoutDate: -1 },
              output: {
                value: "$exercises.totalReps",
                date: "$workoutDate",
                workoutId: "$_id",
              },
            },
          },
        },
      },
    ]);

    const emptyRecord = { value: 0, date: null, workoutId: null };
    const recordOrEmpty = (slot) =>
      slot && slot.value > 0
        ? {
            value: slot.value,
            date: slot.date,
            workoutId: slot.workoutId,
          }
        : emptyRecord;

    const prs = {};
    rows.forEach((row) => {
      if (!row._id) return;
      prs[row._id] = {
        maxWeight: recordOrEmpty(row.maxWeight),
        maxVolume: recordOrEmpty(row.maxVolume),
        maxReps: recordOrEmpty(row.maxReps),
        latest: row.latest
          ? {
              value: row.latest.value,
              date: row.latest.date,
              workoutId: row.latest.workoutId,
            }
          : null,
      };
    });

    res.setHeader(
      "Cache-Control",
      "private, max-age=30, stale-while-revalidate=60",
    );
    res.status(200).json({
      success: true,
      data: prs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};