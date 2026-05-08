import mongoose from "mongoose";
import { sanitizeTextInput } from "../utils/sanitizeInput.js";

const userSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, unique: true }, // Primary UID (can be Firebase or Supabase)
    firebaseUid: { type: String, sparse: true, unique: true }, // Firebase UID for existing users
    supabaseUid: { type: String, sparse: true, unique: true }, // Supabase UID for new/migrated users
    authProvider: { 
      type: String, 
      enum: ["firebase", "supabase"], 
      default: "firebase" // Default to firebase for backward compatibility
    },
    name: { type: String, set: sanitizeTextInput },
    email: { type: String, required: true, unique: true },
    username: { type: String, required: false, unique: true, set: sanitizeTextInput },
    picture: { type: String, default: "" },
    backgroundPicture: { type: String, default: "" },
    bio: { type: String, default: "", set: sanitizeTextInput },
    goal: { type: String, default: "", set: sanitizeTextInput },
    gymName: { type: String, default: "", set: sanitizeTextInput },
    url: String,
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // Add privacy settings
    privacy: {
      isPrivate: { type: Boolean, default: true },
      // You can add more granular controls if needed
      showEmail: { type: Boolean, default: false },
      showEntries: { type: Boolean, default: true },
    },
    // Trainer dashboard access (beta feature)
    trainerDashboardAccess: {
      type: String,
      enum: ["none", "requested", "approved"],
      default: "none",
    },
    // Admin flag
    isAdmin: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Follow Request Schema
const followRequestSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Ensure unique follow requests (one pending request per requester-recipient pair)
followRequestSchema.index({ requester: 1, recipient: 1 }, { unique: true });

const postSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true, set: sanitizeTextInput },
  image: String,
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
});

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
  content: { type: String, required: true, set: sanitizeTextInput },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const FollowRequest = mongoose.model("FollowRequest", followRequestSchema);
const Post = mongoose.model("Post", postSchema);
const Comment = mongoose.model("Comment", commentSchema);

export { User, FollowRequest, Post, Comment };
