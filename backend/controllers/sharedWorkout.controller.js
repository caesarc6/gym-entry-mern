import mongoose from "mongoose";
import SharedWorkout from "../models/sharedWorkout.model.js";
import WorkoutAssignment from "../models/workoutAssignment.model.js";
import { User } from "../models/user.model.js";
import Entry from "../models/entry.model.js";

// Create a new shared workout
export const createSharedWorkout = async (req, res) => {
  try {
    const { uid, name } = req.user; // From auth middleware
    const {
      workoutName,
      clientName,
      description,
      image,
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
      exercises: exercises || [],
      tags: tags || [],
      createdAt: createdAt ? new Date(createdAt + "T00:00:00Z") : new Date(),
    });

    await sharedWorkout.save();

    // If client name is provided, automatically create an share
    if (clientName && clientName.trim()) {
      const normalizedClientName = clientName.trim().toLowerCase();
      const escapedClientName = normalizedClientName.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );
      const nameMatchRegex = new RegExp(`^${escapedClientName}$`, "i");

      // Create name-only assignment for future claims
      const share = new WorkoutAssignment({
        sharedWorkoutId: sharedWorkout._id,
        assignedToUid: null, // Name-only share
        assignedToName: normalizedClientName,
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

      // Find all users who have previously claimed workouts for this client name from this trainer
      // This means they've already linked their account to this client name
      // Strategy: Find all SharedWorkouts for this client name, then find users who claimed them

      // First, find all existing workouts for this client name from this trainer
      const existingClientWorkouts = await SharedWorkout.find({
        creatorUid: uid,
        clientName: nameMatchRegex,
        isActive: true,
      }).select("_id");

      const existingWorkoutIds = existingClientWorkouts.map((w) => w._id);

      // Then, find all users who have claimed any of those workouts
      // This works regardless of what assignedToName they have
      const existingClaimedAssignments = await WorkoutAssignment.find({
        sharedWorkoutId: { $in: existingWorkoutIds },
        assignedToUid: { $ne: null }, // Only registered users
        isRegisteredUser: true,
      }).select("assignedToUid assignedToName");

      const existingClaimedUserIds = [
        ...new Set(
          existingClaimedAssignments
            .map((assignment) => assignment.assignedToUid)
            .filter(Boolean)
        ),
      ];

      // Update assignedToName for all existing assignments to use the normalized client name
      // This ensures consistency for future matching
      if (existingClaimedAssignments.length > 0) {
        await WorkoutAssignment.updateMany(
          {
            sharedWorkoutId: { $in: existingWorkoutIds },
            assignedToUid: { $ne: null },
            isRegisteredUser: true,
          },
          {
            assignedToName: normalizedClientName,
          }
        );
      }

      // Track how many users get auto-assigned
      let autoAssignedCount = 0;

      // If there are users who have previously claimed workouts for this client name,
      // automatically assign this new workout to them
      if (existingClaimedUserIds.length > 0) {
        for (const userId of existingClaimedUserIds) {
          // Get user info
          const user = await User.findOne({ uid: userId });
          if (!user) continue;

          // Check if user already has this workout assigned (shouldn't happen, but safety check)
          const existingAssignment = await WorkoutAssignment.findOne({
            sharedWorkoutId: sharedWorkout._id,
            assignedToUid: userId,
          });

          if (existingAssignment) continue; // Skip if already assigned

          // Create assignment for this user
          const autoAssignment = new WorkoutAssignment({
            sharedWorkoutId: sharedWorkout._id,
            assignedToUid: userId,
            assignedToName: normalizedClientName,
            assignedToEmail: user.email || null,
            isRegisteredUser: true,
            sharedByUid: uid,
            sharedByName: name || "Trainer",
            customLabel: workoutName,
            instructions:
              "Automatically assigned - new workout for your client profile",
            targetDate: null,
            dueDate: null,
          });

          await autoAssignment.save();
          autoAssignedCount++;

          // Get trainer info for display
          const trainer = await User.findOne({ uid: uid }).select(
            "name username"
          );

          // Create workout post on the user's profile
          const workoutPost = new Entry({
            name: workoutName,
            uid: userId,
            description: description, // Store description without prefix
            image:
              image ||
              "https://coffective.com/wp-content/uploads/2018/06/default-featured-image.png.jpg",
            shareable: false,
            shareToken: null,
            shareExpiry: null,
            originalEntryId: null,
            sharedWorkoutId: sharedWorkout._id, // Link to SharedWorkout for sync
            trainerUid: uid,
            trainerName: trainer?.name || name || "Trainer",
            trainerUsername: trainer?.username || null,
          });

          await workoutPost.save();

          // Update shared workout share count
          await SharedWorkout.findByIdAndUpdate(sharedWorkout._id, {
            $inc: { totalShares: 1 },
          });
        }

      }

      // Build response message
      let message = "Shared workout created successfully";
      if (autoAssignedCount > 0) {
        message = `Shared workout created and automatically assigned to ${autoAssignedCount} existing client${
          autoAssignedCount > 1 ? "s" : ""
        }`;
      } else {
        message = "Shared workout created and sent to client successfully";
      }

      res.status(201).json({
        success: true,
        message,
        data: sharedWorkout,
      });
      return;
    }

    // Response for workouts without client name
    res.status(201).json({
      success: true,
      message: "Shared workout created successfully",
      data: sharedWorkout,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Get all shared workouts for a trainer
export const getTrainerSharedWorkouts = async (req, res) => {
  try {
    const { uid } = req.user;
    const { page = 1, limit = 10, search } = req.query;

    const query = { creatorUid: uid, isActive: true };

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
      updates.createdAt = new Date(updates.createdAt + "T00:00:00Z");
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

    // Update all Entry posts that are linked to this SharedWorkout
    // This ensures that when a trainer edits a workout, clients see the updated version
    const entryUpdates = {};

    // Build updates only for fields that were actually changed
    if (updates.workoutName !== undefined) {
      entryUpdates.name = updates.workoutName;
    }
    if (updates.description !== undefined) {
      // Store description without prefix - trainer info is stored separately
      entryUpdates.description = updates.description;
    }
    if (updates.image !== undefined) {
      entryUpdates.image = updates.image;
    }

    // Only update Entry posts if there are actual changes
    if (Object.keys(entryUpdates).length > 0) {
      // Convert sharedWorkoutId to ObjectId for consistent querying
      const workoutObjectId = new mongoose.Types.ObjectId(sharedWorkoutId);

      // Find all entries linked to this SharedWorkout
      const linkedEntries = await Entry.find({
        sharedWorkoutId: workoutObjectId,
      });


      if (linkedEntries.length > 0) {
        const updateResult = await Entry.updateMany(
          { sharedWorkoutId: workoutObjectId },
          { $set: entryUpdates }
        );

      } else {
        // Try to find entries by workout name as fallback (for entries created before sharedWorkoutId was added)
        const fallbackEntries = await Entry.find({
          name: template.workoutName,
          description: { $regex: new RegExp(template.creatorName, "i") },
          sharedWorkoutId: null, // Only find entries that don't have sharedWorkoutId
        });

        if (fallbackEntries.length > 0) {

          // Update these entries with sharedWorkoutId and new data
          const fallbackUpdate = {
            ...entryUpdates,
            sharedWorkoutId: workoutObjectId, // Add the sharedWorkoutId for future syncing
          };

          const fallbackResult = await Entry.updateMany(
            {
              _id: { $in: fallbackEntries.map((e) => e._id) },
            },
            { $set: fallbackUpdate }
          );

        }
      }
    }

    res.status(200).json({
      success: true,
      message: "Shared workout updated successfully",
      data: template,
    });
  } catch (error) {
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
      targetDate: targetDate ? new Date(targetDate + "T00:00:00Z") : null,
      dueDate: dueDate ? new Date(dueDate + "T00:00:00Z") : null,
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
      .populate("sharedWorkoutId", "workoutName")
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
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Check for pending workouts assigned to a name/email
export const checkPendingWorkouts = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name && !email) {
      return res.status(400).json({
        success: false,
        message: "Name or email is required to check for pending workouts",
      });
    }

    // Normalize name for searching (lowercase, trimmed)
    const normalizedName = name ? name.trim().toLowerCase() : null;

    // Build query to find assignments by name or email
    const query = {
      isRegisteredUser: false, // Only look for name-only assignments
      $or: [],
    };

    if (normalizedName) {
      query.$or.push({ assignedToName: normalizedName });
    }
    if (email) {
      query.$or.push({ assignedToEmail: email.trim().toLowerCase() });
    }

    // Find pending assignments
    const pendingAssignments = await WorkoutAssignment.find(query)
      .populate("sharedWorkoutId")
      .sort({ createdAt: -1 });

    if (pendingAssignments.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No pending workouts found",
        data: {
          count: 0,
          assignments: [],
        },
      });
    }

    res.status(200).json({
      success: true,
      message: `Found ${pendingAssignments.length} pending workout${
        pendingAssignments.length > 1 ? "s" : ""
      }`,
      data: {
        count: pendingAssignments.length,
        assignments: pendingAssignments,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Claim pending workouts when user creates an account
export const claimPendingWorkouts = async (req, res) => {
  try {
    const { uid, name } = req.user;
    const { email } = req.body;

    // Normalize name for searching (lowercase, trimmed)
    const normalizedName = name ? name.trim().toLowerCase() : null;
    const normalizedEmail = email ? email.trim().toLowerCase() : null;

    // Build query to find assignments by name or email
    const query = {
      isRegisteredUser: false, // Only claim name-only assignments
      assignedToUid: null,
      $or: [],
    };

    if (normalizedName) {
      query.$or.push({ assignedToName: normalizedName });
    }
    if (normalizedEmail) {
      query.$or.push({ assignedToEmail: normalizedEmail });
    }

    if (query.$or.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Name or email is required to claim workouts",
      });
    }

    // Find all pending assignments that match
    const pendingAssignments = await WorkoutAssignment.find(query);

    if (pendingAssignments.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No pending workouts found to claim",
        data: {
          claimedCount: 0,
          assignments: [],
        },
      });
    }

    // Update all matching assignments to link them to the user
    const updatePromises = pendingAssignments.map((assignment) =>
      WorkoutAssignment.findByIdAndUpdate(
        assignment._id,
        {
          assignedToUid: uid,
          isRegisteredUser: true,
          assignedToEmail: normalizedEmail || assignment.assignedToEmail,
        },
        { new: true }
      ).populate("sharedWorkoutId")
    );

    const claimedAssignments = await Promise.all(updatePromises);

    // Create workout posts for each claimed assignment
    const workoutPosts = [];

    for (const assignment of claimedAssignments) {
      if (assignment.sharedWorkoutId) {
        const sharedWorkout = assignment.sharedWorkoutId;

        // Get trainer info for display
        const trainer = await User.findOne({
          uid: sharedWorkout.creatorUid,
        }).select("name username");

        const workoutPost = new Entry({
          name: sharedWorkout.workoutName,
          uid: uid,
          description: sharedWorkout.description, // Store description without prefix
          image:
            sharedWorkout.image ||
            "https://coffective.com/wp-content/uploads/2018/06/default-featured-image.png.jpg",
          shareable: false,
          shareToken: null,
          shareExpiry: null,
          originalEntryId: null,
          sharedWorkoutId: sharedWorkout._id, // Link to SharedWorkout for sync
          trainerUid: sharedWorkout.creatorUid,
          trainerName: trainer?.name || sharedWorkout.creatorName || "Trainer",
          trainerUsername: trainer?.username || null,
        });

        await workoutPost.save();
        workoutPosts.push({
          _id: workoutPost._id,
          name: workoutPost.name,
          description: workoutPost.description,
          image: workoutPost.image,
          createdAt: workoutPost.createdAt,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Successfully claimed ${claimedAssignments.length} workout${
        claimedAssignments.length > 1 ? "s" : ""
      }!`,
      data: {
        claimedCount: claimedAssignments.length,
        assignments: claimedAssignments,
        workoutPosts: workoutPosts,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Generate a shareable link for a shared workout
export const generateShareableLink = async (req, res) => {
  try {
    const { sharedWorkoutId } = req.params;
    const { uid } = req.user;

    // Verify the shared workout exists and belongs to the trainer
    const sharedWorkout = await SharedWorkout.findOne({
      _id: sharedWorkoutId,
      creatorUid: uid,
      isActive: true,
    });

    if (!sharedWorkout) {
      return res.status(404).json({
        success: false,
        message: "Shared workout not found",
      });
    }

    // Generate a unique share token (using workout ID + timestamp for uniqueness)
    const shareToken = Buffer.from(`${sharedWorkoutId}-${Date.now()}`).toString(
      "base64"
    );

    // Store the share token in the shared workout document
    await SharedWorkout.findByIdAndUpdate(sharedWorkoutId, {
      shareToken,
      shareTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    const shareUrl = `${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }/shared-workout/${shareToken}`;

    res.status(200).json({
      success: true,
      message: "Shareable link generated successfully",
      data: {
        shareToken,
        shareUrl,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Get shared workout by share token (public endpoint)
export const getSharedWorkoutByToken = async (req, res) => {
  try {
    const { shareToken } = req.params;

    if (!shareToken) {
      return res.status(400).json({
        success: false,
        message: "Share token is required",
      });
    }

    // Find the shared workout by share token
    const sharedWorkout = await SharedWorkout.findOne({
      shareToken,
      isActive: true,
      shareTokenExpiresAt: { $gt: new Date() }, // Check if token hasn't expired
    });

    if (!sharedWorkout) {
      return res.status(404).json({
        success: false,
        message: "Shared workout not found or link has expired",
      });
    }

    // Fetch the creator's profile information using the UID
    const creator = await User.findOne({ uid: sharedWorkout.creatorUid });

    res.status(200).json({
      success: true,
      data: {
        sharedWorkout,
        creator: creator
          ? {
              uid: creator.uid,
              name: creator.name,
              username: creator.username,
              picture: creator.picture,
            }
          : {
              uid: sharedWorkout.creatorUid,
              name: sharedWorkout.creatorName,
              username: null,
              picture: null,
            },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Save shared workout to user's account
export const saveSharedWorkoutToAccount = async (req, res) => {
  try {
    const { shareToken } = req.params;
    const { uid, name } = req.user;

    if (!shareToken) {
      return res.status(400).json({
        success: false,
        message: "Share token is required",
      });
    }

    // Find the shared workout by share token
    const sharedWorkout = await SharedWorkout.findOne({
      shareToken,
      isActive: true,
      shareTokenExpiresAt: { $gt: new Date() },
    });

    if (!sharedWorkout) {
      return res.status(404).json({
        success: false,
        message: "Shared workout not found or link has expired",
      });
    }

    // Check if user already has this workout saved
    const existingAssignment = await WorkoutAssignment.findOne({
      sharedWorkoutId: sharedWorkout._id,
      assignedToUid: uid,
    });

    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        message: "You have already saved this workout to your account",
      });
    }

    // Create a new assignment for the user
    const assignment = new WorkoutAssignment({
      sharedWorkoutId: sharedWorkout._id,
      assignedToUid: uid,
      assignedToName: name || "User",
      assignedToEmail: null,
      isRegisteredUser: true,
      sharedByUid: sharedWorkout.creatorUid,
      sharedByName: sharedWorkout.creatorName,
      customLabel: sharedWorkout.workoutName,
      instructions: "Saved from shareable link",
      targetDate: null,
      dueDate: null,
    });

    await assignment.save();

    // Get trainer info for display
    const trainer = await User.findOne({
      uid: sharedWorkout.creatorUid,
    }).select("name username");

    // Create a workout post on the client's profile
    const workoutPost = new Entry({
      name: sharedWorkout.workoutName,
      uid: uid,
      description: sharedWorkout.description, // Store description without prefix
      image:
        sharedWorkout.image ||
        "https://coffective.com/wp-content/uploads/2018/06/default-featured-image.png.jpg",
      shareable: false,
      shareToken: null,
      shareExpiry: null,
      originalEntryId: null,
      sharedWorkoutId: sharedWorkout._id, // Link to SharedWorkout for sync
      trainerUid: sharedWorkout.creatorUid,
      trainerName: trainer?.name || sharedWorkout.creatorName || "Trainer",
      trainerUsername: trainer?.username || null,
    });

    await workoutPost.save();

    // Update shared workout share count
    await SharedWorkout.findByIdAndUpdate(sharedWorkout._id, {
      $inc: { totalShares: 1 },
    });

    res.status(201).json({
      success: true,
      message: "Workout saved to your account successfully",
      data: {
        assignment,
        workoutPost: {
          _id: workoutPost._id,
          name: workoutPost.name,
          description: workoutPost.description,
          image: workoutPost.image,
          createdAt: workoutPost.createdAt,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Get clients who have claimed workouts from a trainer
export const getTrainerClients = async (req, res) => {
  try {
    const { uid } = req.user;
    const { page = 1, limit = 10, search, sortBy = "recent" } = req.query;

    // Find all assignments where the trainer shared workouts and clients have claimed them
    const query = {
      sharedByUid: uid,
      assignedToUid: { $ne: null }, // Only registered users who have claimed
      isRegisteredUser: true,
      isVisible: true,
    };

    if (search) {
      query.$or = [
        { assignedToName: { $regex: search, $options: "i" } },
        { customLabel: { $regex: search, $options: "i" } },
      ];
    }

    const assignments = await WorkoutAssignment.find(query)
      .populate("sharedWorkoutId", "workoutName description image")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await WorkoutAssignment.countDocuments(query);

    // Group assignments by client (assignedToUid)
    const clientsMap = new Map();

    assignments.forEach((assignment) => {
      const clientUid = assignment.assignedToUid;
      if (!clientsMap.has(clientUid)) {
        clientsMap.set(clientUid, {
          clientUid: clientUid,
          clientName: assignment.assignedToName,
          clientEmail: assignment.assignedToEmail,
          claimedWorkouts: [],
          totalClaimedWorkouts: 0,
          lastClaimedAt: assignment.createdAt,
        });
      }

      const client = clientsMap.get(clientUid);
      client.claimedWorkouts.push({
        assignmentId: assignment._id,
        workoutName: assignment.sharedWorkoutId?.workoutName,
        workoutDescription: assignment.sharedWorkoutId?.description,
        workoutImage: assignment.sharedWorkoutId?.image,
        customLabel: assignment.customLabel,
        status: assignment.status,
        claimedAt: assignment.createdAt,
        completedAt: assignment.userWorkout?.completedAt,
      });
      client.totalClaimedWorkouts++;

      // Update last claimed date if this assignment is more recent
      if (assignment.createdAt > client.lastClaimedAt) {
        client.lastClaimedAt = assignment.createdAt;
      }
    });

    const clients = Array.from(clientsMap.values());

    // Sort clients based on sortBy parameter
    if (sortBy === "recent") {
      clients.sort(
        (a, b) => new Date(b.lastClaimedAt) - new Date(a.lastClaimedAt)
      );
    } else if (sortBy === "name") {
      clients.sort((a, b) => a.clientName.localeCompare(b.clientName));
    }

    res.status(200).json({
      success: true,
      data: {
        clients,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalClients: clients.length,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Generate a shareable link for all workouts under a client name
export const generateClientShareableLink = async (req, res) => {
  try {
    const { uid, name } = req.user;
    const { clientName } = req.body;

    if (!clientName || !clientName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Client name is required",
      });
    }

    // Normalize client name for consistency
    const normalizedClientName = clientName.trim().toLowerCase();

    // Find all workouts for this client under this trainer
    const clientWorkouts = await SharedWorkout.find({
      creatorUid: uid,
      clientName: { $regex: new RegExp(`^${normalizedClientName}$`, "i") },
      isActive: true,
    });

    if (clientWorkouts.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No workouts found for this client",
      });
    }

    // Generate a unique share token that encodes trainer UID and client name
    // Format: base64(uid:clientName:timestamp:expiresAt)
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
    const tokenData = `${uid}:${normalizedClientName}:${Date.now()}:${expiresAt}`;
    // Use base64 and replace URL-unsafe characters
    const shareToken = Buffer.from(tokenData)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    const shareUrl = `${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }/client-claim/${shareToken}`;

    res.status(200).json({
      success: true,
      message: "Client shareable link generated successfully",
      data: {
        shareToken,
        shareUrl,
        clientName: clientName.trim(),
        workoutCount: clientWorkouts.length,
        expiresAt: new Date(expiresAt),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Get all workouts for a client by share token (public endpoint)
export const getClientWorkoutsByToken = async (req, res) => {
  try {
    const { shareToken } = req.params;

    if (!shareToken) {
      return res.status(400).json({
        success: false,
        message: "Share token is required",
      });
    }

    // Decode the token to get trainer UID and client name
    let tokenData;
    try {
      // Decode URL encoding if present
      let decodedToken;
      try {
        decodedToken = decodeURIComponent(shareToken);
      } catch (e) {
        // If decodeURIComponent fails, token might not be URL-encoded, use as-is
        decodedToken = shareToken;
      }

      // Restore base64 format (replace URL-safe characters back)
      const base64Token = decodedToken.replace(/-/g, "+").replace(/_/g, "/");
      // Add padding if needed
      const paddedToken =
        base64Token + "=".repeat((4 - (base64Token.length % 4)) % 4);
      tokenData = Buffer.from(paddedToken, "base64").toString("utf-8");
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid share token - decoding failed",
      });
    }

    // Split token data
    const tokenParts = tokenData.split(":");
    if (tokenParts.length !== 4) {
      return res.status(400).json({
        success: false,
        message: "Invalid share token format",
      });
    }

    const [uid, normalizedClientName, , expiresAtStr] = tokenParts;
    const expiresAt = parseInt(expiresAtStr, 10);

    // Validate token components
    if (!uid || !normalizedClientName || isNaN(expiresAt)) {
      return res.status(400).json({
        success: false,
        message: "Invalid share token - missing required components",
      });
    }

    // Check if token has expired
    if (Date.now() > expiresAt) {
      return res.status(400).json({
        success: false,
        message: "Share link has expired",
      });
    }

    // Find all workouts for this client under this trainer
    const clientWorkouts = await SharedWorkout.find({
      creatorUid: uid,
      clientName: { $regex: new RegExp(`^${normalizedClientName}$`, "i") },
      isActive: true,
    }).sort({ createdAt: -1 });

    if (clientWorkouts.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No workouts found for this client",
      });
    }

    // Fetch the creator's profile information
    const creator = await User.findOne({ uid });

    res.status(200).json({
      success: true,
      data: {
        workouts: clientWorkouts,
        workoutCount: clientWorkouts.length,
        clientName: normalizedClientName,
        creator: creator
          ? {
              uid: creator.uid,
              name: creator.name,
              username: creator.username,
              picture: creator.picture,
            }
          : {
              uid,
              name: "Trainer",
              username: null,
              picture: null,
            },
        expiresAt: new Date(expiresAt),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Claim all workouts for a client by share token
export const claimClientWorkoutsByToken = async (req, res) => {
  try {
    const { shareToken } = req.params;
    const { uid, name } = req.user;

    if (!shareToken) {
      return res.status(400).json({
        success: false,
        message: "Share token is required",
      });
    }

    // Decode the token to get trainer UID and client name
    let tokenData;
    try {
      // Decode URL encoding if present
      let decodedToken;
      try {
        decodedToken = decodeURIComponent(shareToken);
      } catch (e) {
        // If decodeURIComponent fails, token might not be URL-encoded, use as-is
        decodedToken = shareToken;
      }

      // Restore base64 format (replace URL-safe characters back)
      const base64Token = decodedToken.replace(/-/g, "+").replace(/_/g, "/");
      // Add padding if needed
      const paddedToken =
        base64Token + "=".repeat((4 - (base64Token.length % 4)) % 4);
      tokenData = Buffer.from(paddedToken, "base64").toString("utf-8");
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid share token - decoding failed",
      });
    }

    // Split token data
    const tokenParts = tokenData.split(":");
    if (tokenParts.length !== 4) {
      return res.status(400).json({
        success: false,
        message: "Invalid share token format",
      });
    }

    const [trainerUid, normalizedClientName, , expiresAtStr] = tokenParts;
    const expiresAt = parseInt(expiresAtStr, 10);

    // Validate token components
    if (!trainerUid || !normalizedClientName || isNaN(expiresAt)) {
      return res.status(400).json({
        success: false,
        message: "Invalid share token - missing required components",
      });
    }

    // Check if token has expired
    if (Date.now() > expiresAt) {
      return res.status(400).json({
        success: false,
        message: "Share link has expired",
      });
    }

    // Find all workouts for this client under this trainer
    const clientWorkouts = await SharedWorkout.find({
      creatorUid: trainerUid,
      clientName: { $regex: new RegExp(`^${normalizedClientName}$`, "i") },
      isActive: true,
    });

    if (clientWorkouts.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No workouts found for this client",
      });
    }

    // Check which workouts the user has already claimed
    const existingAssignments = await WorkoutAssignment.find({
      sharedWorkoutId: { $in: clientWorkouts.map((w) => w._id) },
      assignedToUid: uid,
    });

    const existingWorkoutIds = new Set(
      existingAssignments.map((a) => a.sharedWorkoutId.toString())
    );

    // Check if Entry posts exist for already-claimed workouts
    // If assignments exist but entries don't, we need to create them
    const existingEntryWorkoutNames = new Set(
      (
        await Entry.find({
          uid: uid,
          name: { $in: clientWorkouts.map((w) => w.workoutName) },
        })
      ).map((e) => e.name)
    );

    // Filter out workouts that have already been claimed
    const workoutsToClaim = clientWorkouts.filter(
      (workout) => !existingWorkoutIds.has(workout._id.toString())
    );

    // Create missing Entry posts for workouts that were already claimed but don't have entries
    const missingEntryWorkouts = clientWorkouts.filter(
      (workout) =>
        existingWorkoutIds.has(workout._id.toString()) &&
        !existingEntryWorkoutNames.has(workout.workoutName)
    );

    // Create Entry posts for workouts that were claimed but don't have entries
    const createdMissingEntries = [];
    for (const workout of missingEntryWorkouts) {
      // Get trainer info for display
      const trainer = await User.findOne({ uid: workout.creatorUid }).select(
        "name username"
      );

      // Also update the existing assignment to use the normalized client name for future auto-assignment
      const existingAssignment = existingAssignments.find(
        (a) => a.sharedWorkoutId.toString() === workout._id.toString()
      );
      if (
        existingAssignment &&
        existingAssignment.assignedToName !== normalizedClientName
      ) {
        await WorkoutAssignment.findByIdAndUpdate(existingAssignment._id, {
          assignedToName: normalizedClientName, // Update to use client name for future matching
        });
      }

      const workoutPost = new Entry({
        name: workout.workoutName,
        uid: uid,
        description: workout.description, // Store description without prefix
        image:
          workout.image ||
          "https://coffective.com/wp-content/uploads/2018/06/default-featured-image.png.jpg",
        shareable: false,
        shareToken: null,
        shareExpiry: null,
        originalEntryId: null,
        sharedWorkoutId: workout._id, // Link to SharedWorkout for sync
        trainerUid: workout.creatorUid,
        trainerName: trainer?.name || workout.creatorName || "Trainer",
        trainerUsername: trainer?.username || null,
      });

      await workoutPost.save();
      createdMissingEntries.push({
        _id: workoutPost._id,
        name: workoutPost.name,
        description: workoutPost.description,
        image: workoutPost.image,
        createdAt: workoutPost.createdAt,
      });
    }

    // If all workouts are already claimed and we've created all missing entries,
    // return success with information about what was done
    if (workoutsToClaim.length === 0 && createdMissingEntries.length > 0) {
      return res.status(200).json({
        success: true,
        message: `All workouts were already claimed. Created ${
          createdMissingEntries.length
        } missing post${
          createdMissingEntries.length > 1 ? "s" : ""
        } in your profile feed.`,
        data: {
          claimedCount: 0,
          skippedCount: clientWorkouts.length,
          createdEntryCount: createdMissingEntries.length,
          totalWorkouts: clientWorkouts.length,
          workoutPosts: createdMissingEntries,
        },
      });
    }

    // If all workouts are already claimed and no missing entries needed to be created
    if (workoutsToClaim.length === 0) {
      return res.status(200).json({
        success: true,
        message: `All ${clientWorkouts.length} workout${
          clientWorkouts.length > 1 ? "s are" : " is"
        } already claimed and appear in your profile feed.`,
        data: {
          claimedCount: 0,
          skippedCount: clientWorkouts.length,
          totalWorkouts: clientWorkouts.length,
        },
      });
    }

    // Create assignments for workouts that haven't been claimed yet
    const assignments = [];
    const workoutPosts = [];

    for (const workout of workoutsToClaim) {
      // Create a new assignment for the user
      // Use normalizedClientName from the token so future workouts can be auto-assigned
      const assignment = new WorkoutAssignment({
        sharedWorkoutId: workout._id,
        assignedToUid: uid,
        assignedToName: normalizedClientName, // Use the client name from token, not user's actual name
        assignedToEmail: null,
        isRegisteredUser: true,
        sharedByUid: trainerUid,
        sharedByName: workout.creatorName,
        customLabel: workout.workoutName,
        instructions: "Claimed via client share link",
        targetDate: null,
        dueDate: null,
      });

      await assignment.save();
      assignments.push(assignment);

      // Get trainer info for display
      const trainer = await User.findOne({ uid: workout.creatorUid }).select(
        "name username"
      );

      // Create a workout post on the client's profile
      const workoutPost = new Entry({
        name: workout.workoutName,
        uid: uid,
        description: workout.description, // Store description without prefix
        image:
          workout.image ||
          "https://coffective.com/wp-content/uploads/2018/06/default-featured-image.png.jpg",
        shareable: false,
        shareToken: null,
        shareExpiry: null,
        originalEntryId: null,
        sharedWorkoutId: workout._id, // Link to SharedWorkout for sync
        trainerUid: workout.creatorUid,
        trainerName: trainer?.name || workout.creatorName || "Trainer",
        trainerUsername: trainer?.username || null,
      });

      await workoutPost.save();
      workoutPosts.push({
        _id: workoutPost._id,
        name: workoutPost.name,
        description: workoutPost.description,
        image: workoutPost.image,
        createdAt: workoutPost.createdAt,
      });

      // Update shared workout share count
      await SharedWorkout.findByIdAndUpdate(workout._id, {
        $inc: { totalShares: 1 },
      });
    }

    // Build success message
    let message = `Successfully claimed ${assignments.length} workout${
      assignments.length > 1 ? "s" : ""
    }!`;

    if (existingAssignments.length > 0) {
      message += ` (${existingAssignments.length} workout${
        existingAssignments.length > 1 ? "s were" : " was"
      } already claimed and skipped)`;
    }

    if (createdMissingEntries.length > 0) {
      message += ` Created ${createdMissingEntries.length} missing post${
        createdMissingEntries.length > 1 ? "s" : ""
      } in your profile feed.`;
    }

    res.status(201).json({
      success: true,
      message,
      data: {
        claimedCount: assignments.length,
        skippedCount: existingAssignments.length,
        createdEntryCount: createdMissingEntries.length,
        totalWorkouts: clientWorkouts.length,
        assignments: assignments.map((a) => ({
          _id: a._id,
          sharedWorkoutId: a.sharedWorkoutId,
          customLabel: a.customLabel,
        })),
        workoutPosts: [...workoutPosts, ...createdMissingEntries],
      },
    });
  } catch (error) {
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
  checkPendingWorkouts,
  claimPendingWorkouts,
  generateShareableLink,
  getSharedWorkoutByToken,
  saveSharedWorkoutToAccount,
  getTrainerClients,
  generateClientShareableLink,
  getClientWorkoutsByToken,
  claimClientWorkoutsByToken,
};
