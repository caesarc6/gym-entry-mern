import mongoose from "mongoose";

const setSchema = new mongoose.Schema({
  reps: { type: Number, required: true },
  weight: { type: Number, required: true },
  unit: { type: String, default: "lbs" },
  completed: { type: Boolean, default: true },
});

const exerciseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sets: [setSchema],
  totalVolume: { type: Number, required: true },
  maxWeight: { type: Number, required: true },
  totalReps: { type: Number, required: true },
});

const workoutSchema = new mongoose.Schema({
  entryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Entry",
    required: true,
  },
  userId: { type: String, required: true },
  title: { type: String, required: true }, // e.g., "Push @blink"
  split: { type: String }, // extracted from title
  gym: { type: String }, // extracted from title
  exercises: [exerciseSchema],
  totalVolume: { type: Number, required: true },
  workoutDate: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes for efficient queries
workoutSchema.index({ userId: 1, workoutDate: -1 });
workoutSchema.index({ userId: 1, "exercises.name": 1 });
workoutSchema.index({ entryId: 1 }, { unique: true });

const Workout = mongoose.model("Workout", workoutSchema);

export default Workout;
