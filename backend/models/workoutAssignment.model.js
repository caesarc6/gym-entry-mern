import mongoose from "mongoose";

const workoutAssignmentSchema = new mongoose.Schema(
  {
    // Shared Workout Reference
    sharedWorkoutId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SharedWorkout",
      required: true,
    },

    // Assignment Details
    assignedToUid: {
      type: String,
      required: false, // Made optional to support name-only assignments
    },
    assignedToName: {
      type: String,
      required: true,
    },
    assignedToEmail: String,
    isRegisteredUser: {
      type: Boolean,
      default: false, // Track if this is a registered user or name-only assignment
    },

    // Trainer/Coach who shared
    sharedByUid: {
      type: String,
      required: true,
    },
    sharedByName: {
      type: String,
      required: true,
    },

    // Sharing Configuration
    customLabel: {
      type: String, // Custom name the trainer gives to this specific share
      required: true,
    },
    instructions: String, // Special instructions for this user
    targetDate: Date, // When the workout should be completed
    dueDate: Date, // Deadline for completion

    // Status Tracking
    status: {
      type: String,
      enum: ["shared", "in_progress", "completed", "skipped"],
      default: "shared",
    },

    // User's Workout Data (when they complete it)
    userWorkout: {
      completedAt: Date,
      actualExercises: [
        {
          name: String,
          setsCompleted: Number,
          repsCompleted: String,
          weightUsed: String,
          notes: String,
          addedBy: {
            type: String,
            enum: ["client", "trainer"],
            default: "client",
          },
          addedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      userNotes: String,
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      feedback: String,
    },

    // Trainer's feedback on completion
    trainerFeedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      notes: String,
      feedbackDate: Date,
    },

    // Progress tracking
    isVisible: {
      type: Boolean,
      default: true,
    },
    savedToAccount: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
workoutAssignmentSchema.index({ assignedToUid: 1, status: 1 });
workoutAssignmentSchema.index({ assignedByUid: 1, createdAt: -1 });
workoutAssignmentSchema.index({ templateId: 1 });

const WorkoutAssignment = mongoose.model(
  "WorkoutAssignment",
  workoutAssignmentSchema
);

export default WorkoutAssignment;
