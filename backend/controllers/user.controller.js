import mongoose from "mongoose";

import User from "../models/user.model.js";

import express from "express";
// import User from "../models/user.model.js";
import Entry from "../models/entry.model.js";
import { verifyIdToken } from "../middleware/auth.js"; // Middleware to verify Firebase ID token

const router = express.Router();

// Create a new user
export const createUser = async (req, res) => {
  const { uid, name, email, picture } = req.user;

  try {
    let user = await User.findOne({ uid });

    if (!user) {
      user = new User({ uid, name, email, picture });
      await user.save();
    }

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to create user" });
  }
};

// Create a new entry
export const createPost = async (req, res) => {
  const entry = req.body; // user will send this data
  // console.log("Entry:", entry);
  if (!entry.name || !entry.description) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide all fields", entry });
  }
  const { name, description, image } = req.body;
  const { uid } = req.user;

  try {
    // console.log("UID:", uid);
    const post = new Entry({ uid, name, description, image });
    // console.log(post);
    await post.save();
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: "Failed to create entry1" });
  }
};

// Get entries by UID
export const getPostsByUID = async (req, res) => {
  const { uid } = req.params;
  // console.log("UID:", uid);

  try {
    const entries = await Entry.find({ uid });
    res.status(200).json({ success: true, data: entries });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve entries" });
  }
  //
};

// get users in database sending back all users with name and UID
export const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("name uid");
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve users" });
  }
};

export const getCurrentUser = async (req, res) => {
  const { uid } = req.user;

  try {
    const user = await User.findOne({ uid }).select("uid name email picture");

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve user" });
  }
};

// get user UID and name
export const getUser = async (req, res) => {
  const { uid } = req.params;

  try {
    const user = await User.findOne({ uid }).select("name uid");
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve user" });
  }
};

// get user profile (User info and posts)
export const getUserProfile = async (req, res) => {
  const { uid } = req.params;

  try {
    const user = await User.findOne({ uid }).select(
      "name email profileImage bio goal gymName"
    );
    const postsLength = await Entry.find({ uid });
    const postsCount = postsLength.length;
    res.status(200).json({ success: true, data: user, postsCount });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve user profile" });
  }
};

export default router;
