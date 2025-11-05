import mongoose from "mongoose";

const entrySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    uid: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    // image can be defaulted to a string if not provided
    image: {
      type: String,
      required: true,
      default:
        "https://coffective.com/wp-content/uploads/2018/06/default-featured-image.png.jpg",
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
        },
        uid: {
          type: String,
          required: false, // Changed to false to prevent validation errors with existing malformed data
        },
        username: String,
        name: String,
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
            username: String,
            name: String,
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
            },
            uid: {
              type: String,
              required: false, // Changed to false to prevent validation errors with existing malformed data
            },
            username: String,
            name: String,
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
    },
    trainerUsername: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

const Entry = mongoose.model("Entry", entrySchema);

export default Entry;
