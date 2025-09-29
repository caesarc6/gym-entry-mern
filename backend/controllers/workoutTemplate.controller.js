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
      category,
      difficulty,
      estimatedDuration,
      exercises: exercises || [],
      tags: tags || [],
    });

    await sharedWorkout.save();

    // If client name is provided, automatically create an assignment
    if (clientName && clientName.trim()) {
      const assignment = new WorkoutAssignment({
        sharedWorkoutId: sharedWorkout._id,
        assignedToUid: null, // Name-only assignment
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

      await assignment.save();

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

// Get a specific workout template
export const getWorkoutTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { uid } = req.user;

    const template = await WorkoutTemplate.findOne({
      _id: templateId,
      creatorUid: uid,
      isActive: true,
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Workout template not found",
      });
    }

    res.status(200).json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error("Error getting workout template:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Update a workout template
export const updateWorkoutTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { uid } = req.user;
    const updates = req.body;

    const template = await WorkoutTemplate.findOneAndUpdate(
      { _id: templateId, creatorUid: uid },
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Workout template not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Workout template updated successfully",
      data: template,
    });
  } catch (error) {
    console.error("Error updating workout template:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Delete a workout template (soft delete)
export const deleteWorkoutTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { uid } = req.user;

    const template = await WorkoutTemplate.findOneAndUpdate(
      { _id: templateId, creatorUid: uid },
      { isActive: false },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Workout template not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Workout template deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting workout template:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Assign a workout template to a user or by name
export const assignWorkoutToUser = async (req, res) => {
  try {
    const { templateId } = req.params;
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

    // For name-only assignments, we don't require UID
    if (!isNameOnlyAssignment && !assignedToUid) {
      return res.status(400).json({
        success: false,
        message: "User ID is required for registered user assignments",
      });
    }

    // Verify template exists and belongs to trainer
    const template = await WorkoutTemplate.findOne({
      _id: templateId,
      creatorUid: uid,
      isActive: true,
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Workout template not found",
      });
    }

    // Create assignment
    const assignment = new WorkoutAssignment({
      templateId,
      assignedToUid: isNameOnlyAssignment ? null : assignedToUid,
      assignedToName,
      assignedToEmail,
      isRegisteredUser: !isNameOnlyAssignment,
      assignedByUid: uid,
      assignedByName: name || "Trainer",
      customLabel,
      instructions,
      targetDate: targetDate ? new Date(targetDate) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
    });

    await assignment.save();

    // Update template assignment count
    await WorkoutTemplate.findByIdAndUpdate(templateId, {
      $inc: { totalAssignments: 1 },
    });

    res.status(201).json({
      success: true,
      message: "Workout assigned successfully",
      data: assignment,
    });
  } catch (error) {
    console.error("Error assigning workout:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Get all assignments for a trainer
export const getTrainerAssignments = async (req, res) => {
  try {
    const { uid } = req.user;
    const { page = 1, limit = 10, status, search } = req.query;

    const query = { assignedByUid: uid, isVisible: true };

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { assignedToName: { $regex: search, $options: "i" } },
        { customLabel: { $regex: search, $options: "i" } },
      ];
    }

    const assignments = await WorkoutAssignment.find(query)
      .populate("templateId", "templateName category difficulty")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await WorkoutAssignment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        assignments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalAssignments: total,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Error getting trainer assignments:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Get assignments for a specific user
export const getUserAssignments = async (req, res) => {
  try {
    const { uid } = req.user;
    const { status = "assigned" } = req.query;

    const assignments = await WorkoutAssignment.find({
      assignedToUid: uid,
      status,
      isVisible: true,
    })
      .populate("templateId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: assignments,
    });
  } catch (error) {
    console.error("Error getting user assignments:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Mark a workout assignment as saved to user's account
export const markWorkoutAsSaved = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { uid } = req.user;

    const assignment = await WorkoutAssignment.findOneAndUpdate(
      { _id: assignmentId, assignedToUid: uid },
      { savedToAccount: true },
      { new: true }
    );

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Workout marked as saved to account",
      data: assignment,
    });
  } catch (error) {
    console.error("Error marking workout as saved:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Update a workout assignment
export const updateWorkoutAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { uid, name } = req.user;
    const { customLabel, instructions, targetDate, dueDate, status } = req.body;

    // Verify assignment exists and belongs to trainer
    const assignment = await WorkoutAssignment.findOne({
      _id: assignmentId,
      assignedByUid: uid,
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Workout assignment not found",
      });
    }

    // Update the assignment
    const updatedAssignment = await WorkoutAssignment.findByIdAndUpdate(
      assignmentId,
      {
        customLabel: customLabel || assignment.customLabel,
        instructions: instructions || assignment.instructions,
        targetDate: targetDate ? new Date(targetDate) : assignment.targetDate,
        dueDate: dueDate ? new Date(dueDate) : assignment.dueDate,
        status: status || assignment.status,
        updatedAt: new Date(),
      },
      { new: true }
    ).populate("templateId");

    res.status(200).json({
      success: true,
      message: "Workout assignment updated successfully",
      data: updatedAssignment,
    });
  } catch (error) {
    console.error("Error updating workout assignment:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Continue/update an assigned workout by adding more exercises
export const continueAssignedWorkout = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { uid } = req.user;
    const { additionalExercises, userNotes, rating, addedBy, instructions } =
      req.body;

    // Verify assignment exists and belongs to user OR was assigned by the trainer
    const assignment = await WorkoutAssignment.findOne({
      _id: assignmentId,
      $or: [
        { assignedToUid: uid }, // User can continue their own workout
        { assignedByUid: uid }, // Trainer can continue workouts they assigned
      ],
    }).populate("templateId");

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Workout assignment not found",
      });
    }

    // Determine if this is a trainer adding exercises
    const isTrainerAdding =
      assignment.assignedByUid === uid && addedBy === "trainer";

    // Initialize userWorkout if it doesn't exist
    if (!assignment.userWorkout) {
      assignment.userWorkout = {
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

      assignment.userWorkout.actualExercises = [
        ...assignment.userWorkout.actualExercises,
        ...exercisesWithSource,
      ];
    }

    // Update instructions if provided (both trainer and client can update)
    if (instructions !== undefined) {
      assignment.instructions = instructions;
    }

    // Update notes and rating if provided (only client can update these)
    if (!isTrainerAdding) {
      if (userNotes !== undefined) {
        assignment.userWorkout.userNotes = userNotes;
      }
      if (rating !== undefined) {
        assignment.userWorkout.rating = rating;
      }
    }

    // Update status to in_progress if it was assigned, or keep completed if it was completed
    if (assignment.status === "assigned") {
      assignment.status = "in_progress";
    }
    // Note: We don't change completed status back to in_progress to preserve completion history

    // Update completedAt timestamp
    assignment.userWorkout.completedAt = new Date();

    await assignment.save();

    res.status(200).json({
      success: true,
      message: "Workout continued successfully",
      data: assignment,
    });
  } catch (error) {
    console.error("Error continuing workout:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Complete an assigned workout
export const completeAssignedWorkout = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { uid } = req.user;
    const { userNotes, rating, feedback, instructions } = req.body;

    // Verify assignment exists and belongs to user
    const assignment = await WorkoutAssignment.findOne({
      _id: assignmentId,
      assignedToUid: uid,
    }).populate("templateId");

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Workout assignment not found",
      });
    }

    // Initialize userWorkout if it doesn't exist
    if (!assignment.userWorkout) {
      assignment.userWorkout = {
        completedAt: new Date(),
        actualExercises: [],
        userNotes: "",
        rating: null,
        feedback: "",
      };
    }

    // Update instructions if provided
    if (instructions !== undefined) {
      assignment.instructions = instructions;
    }

    // Update final notes, rating, and feedback
    if (userNotes !== undefined) {
      assignment.userWorkout.userNotes = userNotes;
    }
    if (rating !== undefined) {
      assignment.userWorkout.rating = rating;
    }
    if (feedback !== undefined) {
      assignment.userWorkout.feedback = feedback;
    }

    // Mark as completed
    assignment.status = "completed";
    assignment.userWorkout.completedAt = new Date();

    await assignment.save();

    res.status(200).json({
      success: true,
      message: "Workout completed successfully",
      data: assignment,
    });
  } catch (error) {
    console.error("Error completing workout:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export default {
  createWorkoutTemplate,
  getTrainerTemplates,
  getWorkoutTemplate,
  updateWorkoutTemplate,
  deleteWorkoutTemplate,
  assignWorkoutToUser,
  getTrainerAssignments,
  getUserAssignments,
  updateWorkoutAssignment,
  markWorkoutAsSaved,
  continueAssignedWorkout,
  completeAssignedWorkout,
};
