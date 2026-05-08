import mongoose from "mongoose";
import { sanitizeTextInput } from "../utils/sanitizeInput.js";

const workoutTemplateSchema = new mongoose.Schema(
  {
    // Shared Workout Information
    workoutName: {
      type: String,
      required: true,
      set: sanitizeTextInput,
    },
    description: {
      type: String,
      required: true,
      set: sanitizeTextInput,
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
      set: sanitizeTextInput,
    },

    // Workout Organization
    category: {
      type: String,
      enum: [
        "strength",
        "cardio",
        "flexibility",
        "sports",
        "rehabilitation",
        "general",
      ],
      default: "general",
    },
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    estimatedDuration: {
      type: Number, // in minutes
      default: 30,
    },

    // Workout Content
    exercises: [
      {
        name: {
          type: String,
          required: true,
          set: sanitizeTextInput,
        },
        sets: Number,
        reps: { type: String, set: sanitizeTextInput }, // Can be "10-12" or "30 seconds" etc.
        weight: { type: String, set: sanitizeTextInput },
        restTime: { type: String, set: sanitizeTextInput },
        notes: { type: String, set: sanitizeTextInput },
      },
    ],

    // Shared Workout Settings
    isActive: {
      type: Boolean,
      default: true,
    },
    tags: [{ type: String, set: sanitizeTextInput }], // For better organization

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
workoutTemplateSchema.index({ creatorUid: 1, isActive: 1 });
workoutTemplateSchema.index({ category: 1, difficulty: 1 });

const WorkoutTemplate = mongoose.model("WorkoutTemplate", workoutTemplateSchema);

export default WorkoutTemplate;
