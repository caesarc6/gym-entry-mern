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
    url: String, // what is this for  ???? lol
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Array of user IDs who follow this user
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Array of user IDs this user follows
  },
  { timestamps: true }
);

const postSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  image: String, // Optional image URL
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Array of user IDs who liked the post
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

// import mongoose from "mongoose";

// const userSchema = new mongoose.Schema({
//   uid: {
//     type: String,
//     required: true,
//     unique: true,
//   },
//   name: String,
//   email: {
//     type: String,
//     required: true,
//     unique: true,
//   },
//   username: { type: String, required: false, unique: true },
//   picture: String,
//   backgroundPicture: String,
//   bio: String,
//   goal: String,
//   gymName: String,
//   url: String,
// });

// const User = mongoose.model("User", userSchema);

export default { User, Post, Comment };
