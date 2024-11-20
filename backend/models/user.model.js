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
  username: { type: String, required: true, unique: true },
  profileImage: String,
  bio: String,
  goal: String,
  gymName: String,
});

const User = mongoose.model("User", userSchema);

export default User;
