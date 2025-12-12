import Workout from "../models/workout.model.js";
import Entry from "../models/entry.model.js";
import {
  parseWorkoutDescription,
  parseWorkoutTitle,
  calculateTotalVolume,
  extractPRs,
  cleanExerciseName,
} from "../utils/workoutParser.js";
import { normalizeGymName } from "../utils/gymNormalizer.js";

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

    // Calculate date range
    const now = new Date();
    let startDate;

    switch (timeframe) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "1y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Build query
    const query = {
      userId: uid,
      workoutDate: { $gte: startDate },
    };

    if (exercise) {
      query["exercises.name"] = { $regex: exercise, $options: "i" };
    }

    const workouts = await Workout.find(query)
      .sort({ workoutDate: -1 })
      .populate("entryId", "name description createdAt");

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

    if (!exercise) {
      return res.status(400).json({
        success: false,
        message: "Exercise name is required",
      });
    }

    // Calculate date range
    const now = new Date();
    let startDate;

    switch (timeframe) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "1y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const workouts = await Workout.find({
      userId: uid,
      workoutDate: { $gte: startDate },
      "exercises.name": { $regex: exercise, $options: "i" },
    })
      .sort({ workoutDate: 1 })
      .populate("entryId", "name description createdAt");

    const progress = {
      exercise: exercise,
      dataPoints: [],
      maxWeight: 0,
      maxVolume: 0,
      maxReps: 0,
    };

    workouts.forEach((workout) => {
      const exerciseData = workout.exercises.find((e) =>
        e.name.toLowerCase().includes(exercise.toLowerCase())
      );

      if (exerciseData) {
        const dataPoint = {
          date: workout.workoutDate,
          weight: exerciseData.maxWeight,
          reps: exerciseData.totalReps,
          volume: exerciseData.totalVolume,
          sets: exerciseData.sets.length,
          workoutId: workout._id,
        };

        progress.dataPoints.push(dataPoint);

        if (exerciseData.maxWeight > progress.maxWeight) {
          progress.maxWeight = exerciseData.maxWeight;
        }
        if (exerciseData.totalVolume > progress.maxVolume) {
          progress.maxVolume = exerciseData.totalVolume;
        }
        if (exerciseData.totalReps > progress.maxReps) {
          progress.maxReps = exerciseData.totalReps;
        }
      }
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

    const workouts = await Workout.find({ userId: uid }).sort({
      workoutDate: -1,
    });

    const prs = {};

    workouts.forEach((workout) => {
      workout.exercises.forEach((exercise) => {
        const exerciseName = exercise.name;

        if (!prs[exerciseName]) {
          prs[exerciseName] = {
            maxWeight: { value: 0, date: null, workoutId: null },
            maxVolume: { value: 0, date: null, workoutId: null },
            maxReps: { value: 0, date: null, workoutId: null },
          };
        }

        const exercisePRs = prs[exerciseName];

        if (exercise.maxWeight > exercisePRs.maxWeight.value) {
          exercisePRs.maxWeight = {
            value: exercise.maxWeight,
            date: workout.workoutDate,
            workoutId: workout._id,
          };
        }

        if (exercise.totalVolume > exercisePRs.maxVolume.value) {
          exercisePRs.maxVolume = {
            value: exercise.totalVolume,
            date: workout.workoutDate,
            workoutId: workout._id,
          };
        }

        if (exercise.totalReps > exercisePRs.maxReps.value) {
          exercisePRs.maxReps = {
            value: exercise.totalReps,
            date: workout.workoutDate,
            workoutId: workout._id,
          };
        }
      });
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

/**
 * Reprocess all workouts for a user to update exercise names with new normalization
 */
export const reprocessAllWorkouts = async (req, res) => {
  try {
    const { uid } = req.user;

    // Get all workouts for the user
    const workouts = await Workout.find({ userId: uid });

    if (workouts.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No workouts found to reprocess",
        data: { processedCount: 0, updatedCount: 0 },
      });
    }

    let processedCount = 0;
    let updatedCount = 0;

    for (const workout of workouts) {
      let hasChanges = false;

      // Reprocess each exercise in the workout
      for (const exercise of workout.exercises) {
        const originalName = exercise.name;
        const normalizedName = cleanExerciseName(originalName);

        if (originalName !== normalizedName) {
          exercise.name = normalizedName;
          hasChanges = true;
        }
      }

      if (hasChanges) {
        await workout.save();
        updatedCount++;
      }

      processedCount++;
    }

    res.status(200).json({
      success: true,
      message: `Successfully reprocessed ${processedCount} workouts`,
      data: {
        processedCount,
        updatedCount,
        message:
          updatedCount > 0
            ? `Updated exercise names in ${updatedCount} workouts with new normalization`
            : "All exercise names were already normalized",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Reprocess all workouts for a user to update gym names with new normalization
 */
export const reprocessAllWorkoutsWithGymNormalization = async (req, res) => {
  try {
    const { uid } = req.user;

    // Get all workouts for the user
    const workouts = await Workout.find({ userId: uid });

    if (workouts.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No workouts found to reprocess",
        data: { processedCount: 0, updatedCount: 0 },
      });
    }

    let processedCount = 0;
    let updatedCount = 0;

    for (const workout of workouts) {
      let hasChanges = false;

      // Check if gym name needs normalization
      if (workout.gym) {
        const originalGym = workout.gym;
        const normalizedGym = normalizeGymName(originalGym);

        if (originalGym !== normalizedGym) {
          workout.gym = normalizedGym;
          hasChanges = true;
        }
      }

      // Also reprocess each exercise in the workout
      for (const exercise of workout.exercises) {
        const originalName = exercise.name;
        const normalizedName = cleanExerciseName(originalName);

        if (originalName !== normalizedName) {
          exercise.name = normalizedName;
          hasChanges = true;
        }
      }

      if (hasChanges) {
        await workout.save();
        updatedCount++;
      }

      processedCount++;
    }

    res.status(200).json({
      success: true,
      message: `Successfully reprocessed ${processedCount} workouts`,
      data: {
        processedCount,
        updatedCount,
        message:
          updatedCount > 0
            ? `Updated gym names and exercise names in ${updatedCount} workouts with new normalization`
            : "All gym names and exercise names were already normalized",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Completely reprocess all workouts from their original entry descriptions
 * This will fix exercise name categorization issues
 */
export const completelyReprocessAllWorkouts = async (req, res) => {
  try {
    const { uid } = req.user;

    // Get all workouts for the user with their entry data
    const workouts = await Workout.find({ userId: uid }).populate("entryId");

    if (workouts.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No workouts found to reprocess",
        data: { processedCount: 0, updatedCount: 0 },
      });
    }

    let processedCount = 0;
    let updatedCount = 0;

    for (const workout of workouts) {
      if (!workout.entryId) {
        continue;
      }

      let hasChanges = false;

      // Reprocess the workout from the original entry description
      const originalExercises = parseWorkoutDescription(
        workout.entryId.description
      );
      const { split, gym } = parseWorkoutTitle(workout.entryId.name);
      const totalVolume = calculateTotalVolume(originalExercises);

      // Check if exercises have changed
      if (originalExercises.length !== workout.exercises.length) {
        hasChanges = true;
      } else {
        // Check if any exercise names have changed
        for (let i = 0; i < originalExercises.length; i++) {
          const originalExercise = originalExercises[i];
          const existingExercise = workout.exercises[i];

          if (originalExercise.name !== existingExercise.name) {
            hasChanges = true;
          }
        }
      }

      // Check if gym or split has changed
      if (workout.gym !== gym) {
        hasChanges = true;
      }

      if (workout.split !== split) {
        hasChanges = true;
      }

      if (hasChanges) {
        // Update the workout with the reprocessed data
        workout.exercises = originalExercises;
        workout.split = split;
        workout.gym = gym;
        workout.totalVolume = totalVolume;
        workout.updatedAt = new Date();

        await workout.save();
        updatedCount++;
      }

      processedCount++;
    }

    res.status(200).json({
      success: true,
      message: `Successfully reprocessed ${processedCount} workouts`,
      data: {
        processedCount,
        updatedCount,
        message:
          updatedCount > 0
            ? `Updated ${updatedCount} workouts with corrected exercise names and gym names`
            : "All workouts were already correctly processed",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
