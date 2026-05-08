import mongoose from "mongoose";
import { sanitizeTextInput } from "../utils/sanitizeInput.js";

const entrySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      set: sanitizeTextInput,
    },
    uid: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
      set: sanitizeTextInput,
    },
    // Missing post images are resolved in the frontend with theme-aware assets.
    image: {
      type: String,
    },
    // likes: {
    //   type: Number,
    //   default: 0,
    // },

    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Array of User references
    // add timestamps for comments
    comments: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          auto: true,
        },
        text: {
          type: String,
          required: true,
          set: sanitizeTextInput,
        },
        uid: {
          type: String,
          required: false, // Changed to false to prevent validation errors with existing malformed data
        },
        username: { type: String, set: sanitizeTextInput },
        name: { type: String, set: sanitizeTextInput },
        picture: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
        edited: {
          type: Boolean,
          default: false,
        },
        likes: [
          {
            uid: String,
            username: { type: String, set: sanitizeTextInput },
            name: { type: String, set: sanitizeTextInput },
            picture: String,
          },
        ],
        replies: [
          {
            _id: {
              type: mongoose.Schema.Types.ObjectId,
              auto: true,
            },
            text: {
              type: String,
              required: true,
              set: sanitizeTextInput,
            },
            uid: {
              type: String,
              required: false, // Changed to false to prevent validation errors with existing malformed data
            },
            username: { type: String, set: sanitizeTextInput },
            name: { type: String, set: sanitizeTextInput },
            picture: String,
            createdAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
      },
    ],
    // Sharing functionality fields
    shareable: {
      type: Boolean,
      default: false,
    },
    shareToken: {
      type: String,
      default: null,
    },
    shareExpiry: {
      type: Date,
      default: null,
    },
    // Reference to original entry if this is a saved shared workout
    originalEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Entry",
      default: null,
    },
    // Reference to SharedWorkout if this entry came from a claimed workout
    sharedWorkoutId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SharedWorkout",
      default: null,
    },
    // Trainer information if this workout was shared by a trainer
    trainerUid: {
      type: String,
      default: null,
    },
    trainerName: {
      type: String,
      default: null,
      set: sanitizeTextInput,
    },
    trainerUsername: {
      type: String,
      default: null,
      set: sanitizeTextInput,
    },
    // In-progress text while editing (owner-only); excluded from default queries (select: false).
    editDraft: {
      type: new mongoose.Schema(
        {
          name: { type: String, set: sanitizeTextInput },
          description: { type: String, set: sanitizeTextInput },
          updatedAt: { type: Date, default: Date.now },
        },
        { _id: false },
      ),
      default: undefined,
      select: false,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Home feed queries filter by one or more owner UIDs and sort newest first.
entrySchema.index({ uid: 1, createdAt: -1 }, { name: "uid_createdAt_desc" });
entrySchema.index({ createdAt: -1, uid: 1 }, { name: "createdAt_desc_uid" });

const Entry = mongoose.model("Entry", entrySchema);

export default Entry;
