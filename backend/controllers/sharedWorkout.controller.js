import mongoose from "mongoose";
import SharedWorkout from "../models/sharedWorkout.model.js";
import WorkoutAssignment from "../models/workoutAssignment.model.js";

// Create a new shared workout
export const createSharedWorkout = async (req, res) => {
  try {
    const { uid, name } = req.user; // From auth middleware
    const {
      workoutName,
      clientName,
      description,
      image,
      category,
      difficulty,
      estimatedDuration,
      exercises,
      tags,
      createdAt,
    } = req.body;

    if (!workoutName || !description) {
      return res.status(400).json({
        success: false,
        message: "Workout name and description are required",
      });
    }

    const sharedWorkout = new SharedWorkout({
      workoutName,
      description,
      image,
      creatorUid: uid,
      creatorName: name || "Trainer",
      clientName: clientName || null,
      category,
      difficulty,
      estimatedDuration,
      exercises: exercises || [],
      tags: tags || [],
      createdAt: createdAt ? new Date(createdAt + "T00:00:00") : new Date(),
    });

    await sharedWorkout.save();

    // If client name is provided, automatically create an share
    if (clientName && clientName.trim()) {
      const share = new WorkoutAssignment({
        sharedWorkoutId: sharedWorkout._id,
        assignedToUid: null, // Name-only share
        assignedToName: clientName.trim().toLowerCase(),
        assignedToEmail: null,
        isRegisteredUser: false,
        sharedByUid: uid,
        sharedByName: name || "Trainer",
        customLabel: workoutName, // Use workout name as the label
        instructions: null,
        targetDate: null,
        dueDate: null,
      });

      await share.save();

      // Update shared workout share count
      await SharedWorkout.findByIdAndUpdate(sharedWorkout._id, {
        $inc: { totalShares: 1 },
      });
    }

    res.status(201).json({
      success: true,
      message:
        clientName && clientName.trim()
          ? "Shared workout created and sent to client successfully"
          : "Shared workout created successfully",
      data: sharedWorkout,
    });
  } catch (error) {
    console.error("Error creating shared workout:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Get all shared workouts for a trainer
export const getTrainerSharedWorkouts = async (req, res) => {
  try {
    const { uid } = req.user;
    const { page = 1, limit = 10, category, difficulty, search } = req.query;

    const query = { creatorUid: uid, isActive: true };

    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;
    if (search) {
      query.$or = [
        { workoutName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const sharedWorkouts = await SharedWorkout.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await SharedWorkout.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        sharedWorkouts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalSharedWorkouts: total,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Error getting trainer shared workouts:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Get a specific shared workout
export const getSharedWorkout = async (req, res) => {
  try {
    const { sharedWorkoutId } = req.params;
    const { uid } = req.user;

    const template = await SharedWorkout.findOne({
      _id: sharedWorkoutId,
      creatorUid: uid,
      isActive: true,
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Shared workout not found",
      });
    }

    res.status(200).json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error("Error getting shared workout:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Update a shared workout
export const updateSharedWorkout = async (req, res) => {
  try {
    const { sharedWorkoutId } = req.params;
    const { uid } = req.user;
    const updates = req.body;

    // Handle createdAt field if provided
    if (updates.createdAt) {
      updates.createdAt = new Date(updates.createdAt + "T00:00:00");
    }

    // Use native MongoDB update to bypass Mongoose timestamp restrictions
    const ObjectId = mongoose.Types.ObjectId;

    const db = SharedWorkout.db;
    const collection = db.collection("sharedworkouts");

    // First verify the document exists and belongs to the user
    const existingDoc = await SharedWorkout.findOne({
      _id: sharedWorkoutId,
      creatorUid: uid,
    });
    if (!existingDoc) {
      return res.status(404).json({
        success: false,
        message: "Shared workout not found",
      });
    }

    // Use native MongoDB update with ObjectId
    const result = await collection.updateOne(
      { _id: new ObjectId(sharedWorkoutId), creatorUid: uid },
      { $set: updates }
    );

    // Fetch the updated document directly from MongoDB collection
    const template = await collection.findOne({
      _id: new ObjectId(sharedWorkoutId),
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Shared workout not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Shared workout updated successfully",
      data: template,
    });
  } catch (error) {
    console.error("Error updating shared workout:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Delete a shared workout (soft delete)
export const deleteSharedWorkout = async (req, res) => {
  try {
    const { sharedWorkoutId } = req.params;
    const { uid } = req.user;

    const template = await SharedWorkout.findOneAndUpdate(
      { _id: sharedWorkoutId, creatorUid: uid },
      { isActive: false },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Shared workout not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Shared workout deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting shared workout:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Share a workout with a user or by name
export const shareWorkoutToUser = async (req, res) => {
  try {
    const { sharedWorkoutId } = req.params;
    const { uid, name } = req.user;
    const {
      assignedToUid,
      assignedToName,
      assignedToEmail,
      customLabel,
      instructions,
      targetDate,
      dueDate,
      isNameOnlyAssignment = false,
    } = req.body;

    if (!assignedToName || !customLabel) {
      return res.status(400).json({
        success: false,
        message: "Client name and custom label are required",
      });
    }

    // For name-only shares, we don't require UID
    if (!isNameOnlyAssignment && !assignedToUid) {
      return res.status(400).json({
        success: false,
        message: "User ID is required for registered user shares",
      });
    }

    // Verify template exists and belongs to trainer
    const template = await SharedWorkout.findOne({
      _id: sharedWorkoutId,
      creatorUid: uid,
      isActive: true,
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Shared workout not found",
      });
    }

    // Create share
    const share = new WorkoutAssignment({
      sharedWorkoutId,
      assignedToUid: isNameOnlyAssignment ? null : assignedToUid,
      assignedToName,
      assignedToEmail,
      isRegisteredUser: !isNameOnlyAssignment,
      sharedByUid: uid,
      sharedByName: name || "Trainer",
      customLabel,
      instructions,
      targetDate: targetDate ? new Date(targetDate + "T00:00:00") : null,
      dueDate: dueDate ? new Date(dueDate + "T00:00:00") : null,
    });

    await share.save();

    // Update template share count
    await SharedWorkout.findByIdAndUpdate(sharedWorkoutId, {
      $inc: { totalShares: 1 },
    });

    res.status(201).json({
      success: true,
      message: "Workout assigned successfully",
      data: share,
    });
  } catch (error) {
    console.error("Error assigning workout:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Get all shares for a trainer
export const getTrainerAssignments = async (req, res) => {
  try {
    const { uid } = req.user;
    const { page = 1, limit = 10, status, search } = req.query;

    const query = { sharedByUid: uid, isVisible: true };

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { assignedToName: { $regex: search, $options: "i" } },
        { customLabel: { $regex: search, $options: "i" } },
      ];
    }

    const shares = await WorkoutAssignment.find(query)
      .populate("sharedWorkoutId", "workoutName category difficulty")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await WorkoutAssignment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        shares,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalShares: total,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Error getting trainer shares:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Get shares for a specific user
export const getUserAssignments = async (req, res) => {
  try {
    const { uid } = req.user;
    const { status = "shared" } = req.query;

    const shares = await WorkoutAssignment.find({
      assignedToUid: uid,
      status,
      isVisible: true,
    })
      .populate("sharedWorkoutId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: shares,
    });
  } catch (error) {
    console.error("Error getting user shares:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Mark a workout share as saved to user's account
export const markWorkoutAsSaved = async (req, res) => {
  try {
    const { shareId } = req.params;
    const { uid } = req.user;

    const share = await WorkoutAssignment.findOneAndUpdate(
      { _id: shareId, assignedToUid: uid },
      { savedToAccount: true },
      { new: true }
    );

    if (!share) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Workout marked as saved to account",
      data: share,
    });
  } catch (error) {
    console.error("Error marking workout as saved:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Update a workout share
export const updateWorkoutAssignment = async (req, res) => {
  try {
    const { shareId } = req.params;
    const { uid, name } = req.user;
    const { customLabel, instructions, targetDate, dueDate, status } = req.body;

    // Verify share exists and belongs to trainer
    const share = await WorkoutAssignment.findOne({
      _id: shareId,
      sharedByUid: uid,
    });

    if (!share) {
      return res.status(404).json({
        success: false,
        message: "Workout share not found",
      });
    }

    // Update the share
    const updatedAssignment = await WorkoutAssignment.findByIdAndUpdate(
      shareId,
      {
        customLabel: customLabel || share.customLabel,
        instructions: instructions || share.instructions,
        targetDate: targetDate ? new Date(targetDate) : share.targetDate,
        dueDate: dueDate ? new Date(dueDate) : share.dueDate,
        status: status || share.status,
        updatedAt: new Date(),
      },
      { new: true }
    ).populate("sharedWorkoutId");

    res.status(200).json({
      success: true,
      message: "Workout share updated successfully",
      data: updatedAssignment,
    });
  } catch (error) {
    console.error("Error updating workout share:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Continue/update an assigned workout by adding more exercises
export const continueAssignedWorkout = async (req, res) => {
  try {
    const { shareId } = req.params;
    const { uid } = req.user;
    const { additionalExercises, userNotes, rating, addedBy, instructions } =
      req.body;

    // Verify share exists and belongs to user OR was assigned by the trainer
    const share = await WorkoutAssignment.findOne({
      _id: shareId,
      $or: [
        { assignedToUid: uid }, // User can continue their own workout
        { sharedByUid: uid }, // Trainer can continue workouts they assigned
      ],
    }).populate("sharedWorkoutId");

    if (!share) {
      return res.status(404).json({
        success: false,
        message: "Workout share not found",
      });
    }

    // Determine if this is a trainer adding exercises
    const isTrainerAdding = share.sharedByUid === uid && addedBy === "trainer";

    // Initialize userWorkout if it doesn't exist
    if (!share.userWorkout) {
      share.userWorkout = {
        completedAt: new Date(),
        actualExercises: [],
        userNotes: "",
        rating: null,
        feedback: "",
      };
    }

    // Add new exercises to existing ones
    if (additionalExercises && additionalExercises.length > 0) {
      // Mark exercises with who added them
      const exercisesWithSource = additionalExercises.map((exercise) => ({
        ...exercise,
        addedBy: isTrainerAdding ? "trainer" : "client",
      }));

      share.userWorkout.actualExercises = [
        ...share.userWorkout.actualExercises,
        ...exercisesWithSource,
      ];
    }

    // Update instructions if provided (both trainer and client can update)
    if (instructions !== undefined) {
      share.instructions = instructions;
    }

    // Update notes and rating if provided (only client can update these)
    if (!isTrainerAdding) {
      if (userNotes !== undefined) {
        share.userWorkout.userNotes = userNotes;
      }
      if (rating !== undefined) {
        share.userWorkout.rating = rating;
      }
    }

    // Update status to in_progress if it was assigned, or keep completed if it was completed
    if (share.status === "shared") {
      share.status = "in_progress";
    }
    // Note: We don't change completed status back to in_progress to preserve completion history

    // Update completedAt timestamp
    share.userWorkout.completedAt = new Date();

    await share.save();

    res.status(200).json({
      success: true,
      message: "Workout continued successfully",
      data: share,
    });
  } catch (error) {
    console.error("Error continuing workout:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Complete an assigned workout
export const completeAssignedWorkout = async (req, res) => {
  try {
    const { shareId } = req.params;
    const { uid } = req.user;
    const { userNotes, rating, feedback, instructions } = req.body;

    // Verify share exists and belongs to user
    const share = await WorkoutAssignment.findOne({
      _id: shareId,
      assignedToUid: uid,
    }).populate("sharedWorkoutId");

    if (!share) {
      return res.status(404).json({
        success: false,
        message: "Workout share not found",
      });
    }

    // Initialize userWorkout if it doesn't exist
    if (!share.userWorkout) {
      share.userWorkout = {
        completedAt: new Date(),
        actualExercises: [],
        userNotes: "",
        rating: null,
        feedback: "",
      };
    }

    // Update instructions if provided
    if (instructions !== undefined) {
      share.instructions = instructions;
    }

    // Update final notes, rating, and feedback
    if (userNotes !== undefined) {
      share.userWorkout.userNotes = userNotes;
    }
    if (rating !== undefined) {
      share.userWorkout.rating = rating;
    }
    if (feedback !== undefined) {
      share.userWorkout.feedback = feedback;
    }

    // Mark as completed
    share.status = "completed";
    share.userWorkout.completedAt = new Date();

    await share.save();

    res.status(200).json({
      success: true,
      message: "Workout completed successfully",
      data: share,
    });
  } catch (error) {
    console.error("Error completing workout:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export default {
  createSharedWorkout,
  getTrainerSharedWorkouts,
  getSharedWorkout,
  updateSharedWorkout,
  deleteSharedWorkout,
  shareWorkoutToUser,
  getTrainerAssignments,
  getUserAssignments,
  updateWorkoutAssignment,
  markWorkoutAsSaved,
  continueAssignedWorkout,
  completeAssignedWorkout,
};
