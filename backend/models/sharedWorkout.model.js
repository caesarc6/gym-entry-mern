import mongoose from "mongoose";

const sharedWorkoutSchema = new mongoose.Schema(
  {
    // Shared Workout Information
    workoutName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      default:
        "https://coffective.com/wp-content/uploads/2018/06/default-featured-image.png.jpg",
    },

    // Creator (Trainer/Coach)
    creatorUid: {
      type: String,
      required: true,
    },
    creatorName: {
      type: String,
      required: true,
    },

    // Client Information (for direct client association)
    clientName: {
      type: String,
      required: false,
    },

    // Workout Content
    exercises: [
      {
        name: {
          type: String,
          required: true,
        },
        sets: Number,
        reps: String, // Can be "10-12" or "30 seconds" etc.
        weight: String,
        restTime: String,
        notes: String,
      },
    ],

    // Shared Workout Settings
    isActive: {
      type: Boolean,
      default: true,
    },
    tags: [String], // For better organization

    // Sharing tracking
    totalShares: {
      type: Number,
      default: 0,
    },
    completions: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better performance
sharedWorkoutSchema.index({ creatorUid: 1, isActive: 1 });

const SharedWorkout = mongoose.model("SharedWorkout", sharedWorkoutSchema);

export default SharedWorkout;
