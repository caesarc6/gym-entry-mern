import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, unique: true },
    name: String,
    email: { type: String, required: true, unique: true },
    username: { type: String, required: false, unique: true },
    picture: { type: String, default: "" },
    backgroundPicture: { type: String, default: "" },
    bio: { type: String, default: "" },
    goal: { type: String, default: "" },
    gymName: { type: String, default: "" },
    url: String,
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // Add privacy settings
    privacy: {
      isPrivate: { type: Boolean, default: false },
      // You can add more granular controls if needed
      showEmail: { type: Boolean, default: false },
      showEntries: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

const postSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  image: String,
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
});

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Post = mongoose.model("Post", postSchema);
const Comment = mongoose.model("Comment", commentSchema);

export { User, Post, Comment };
