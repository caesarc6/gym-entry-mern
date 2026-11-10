import mongoose from "mongoose";
import { sanitizeTextInput } from "../utils/sanitizeInput.js";

/** Mongoose passes (value, priorVal, …); only forward the value into sanitize. */
const sanitizeString = (value) => sanitizeTextInput(value);

const setSchema = new mongoose.Schema({
  reps: { type: Number, required: true },
  weight: { type: Number, required: true },
  unit: { type: String, default: "lbs", set: sanitizeString },
  completed: { type: Boolean, default: true },
});

const exerciseSchema = new mongoose.Schema({
  name: { type: String, required: true, set: sanitizeString },
  nameKey: { type: String },
  sets: [setSchema],
  totalVolume: { type: Number, required: true },
  maxWeight: { type: Number, required: true },
  totalReps: { type: Number, required: true },
});

exerciseSchema.pre("validate", function stampExerciseNameKey() {
  const name = typeof this.name === "string" ? this.name.trim() : "";
  this.nameKey = name.toLowerCase();
});

const workoutSchema = new mongoose.Schema({
  entryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Entry",
    required: true,
  },
  userId: { type: String, required: true },
  title: { type: String, required: true, set: sanitizeString }, // e.g., "Push @blink"
  split: { type: String, set: sanitizeString }, // extracted from title
  // Short tags like "Pg" are fine; null prior gym must not break the setter.
  gym: { type: String, set: sanitizeString },
  exercises: [exerciseSchema],
  totalVolume: { type: Number, required: true },
  workoutDate: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes for efficient queries
workoutSchema.index({ userId: 1, workoutDate: -1 });
workoutSchema.index({ userId: 1, "exercises.name": 1 });
workoutSchema.index({ userId: 1, "exercises.nameKey": 1, workoutDate: -1 });
workoutSchema.index({ entryId: 1 }, { unique: true });

const Workout = mongoose.model("Workout", workoutSchema);

export default Workout;
