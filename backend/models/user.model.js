import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true,
  },
  name: String,
  email: {
    type: String,
    required: true,
    unique: true,
  },
  username: { type: String, required: false, unique: true },
  picture: String,
  bio: String,
  goal: String,
  gymName: String,
  url: String,
});

const User = mongoose.model("User", userSchema);

export default User;
