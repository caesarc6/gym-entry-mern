import Workout from "../models/workout.model.js";
import Entry from "../models/entry.model.js";
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

/** Fill nameKey on older workout rows so chart lookups can use the index. */
async function ensureExerciseNameKeys(userId) {
  if (!userId) return;
  await Workout.updateMany(
    {
      userId,
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
      split,
      gym,
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

  const exercises = parseWorkoutDescription(entry.description || "");
  const existing = await Workout.findOne({ entryId: entry._id });
  if (exercises.length === 0) {
    if (existing) await Workout.deleteOne({ _id: existing._id });
    return;
  }

  const { split, gym } = parseWorkoutTitle(entry.name || "");
  const totalVolume = calculateTotalVolume(exercises);
  const fields = {
    userId,
    title: entry.name || "Workout",
    split,
    gym,
    exercises,
    totalVolume,
    workoutDate: entry.createdAt || new Date(),
    updatedAt: new Date(),
  };

  if (existing) {
    Object.assign(existing, fields);
    await existing.save();
    return;
  }

  await Workout.create({ entryId: entry._id, ...fields });
}

/**
 * Get all workouts for the current user
 */
export const getAllWorkouts = async (req, res) => {
  try {
    const { uid } = req.user;

    const workouts = await Workout.find({ userId: uid })
      .select("entryId workoutDate title split gym totalVolume")
      .sort({ workoutDate: -1 });

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

    if (nameKey) await ensureExerciseNameKeys(uid);

    const query = {
      userId: uid,
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

    const startDate = timeframeStart(timeframe);
    await ensureExerciseNameKeys(uid);

    const rows = await Workout.aggregate([
      {
        $match: {
          userId: uid,
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

    const rows = await Workout.aggregate([
      { $match: { userId: uid } },
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