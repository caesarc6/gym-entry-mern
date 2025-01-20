// import express from "express";
import mongoose from "mongoose";

import Entry from "../models/entry.model.js";

// import User from "../models/user.model.js";
import { verifyIdToken } from "../middleware/auth.js"; //

// get all products
export const getEntrys = async (req, res) => {
  try {
    const entrys = await Entry.find({});
    res.status(200).json({ success: true, data: entrys });
  } catch (error) {
    console.log("Error in Fetching entries", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// create product
export const createEntry = async (req, res) => {
  const entry = req.body; // user will send this data

  if (!entry.name || !entry.description) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide all fields" });
  }

  const newEntry = new Entry(entry);

  try {
    await newEntry.save();
    res.status(201).json({ success: true, data: newEntry });
  } catch (error) {
    console.error("Error in Create entry:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// update product
export const updateEntry = async (req, res) => {
  const { id } = req.params;

  const entry = req.body;
  console.log("data form data", req.body);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(404)
      .json({ success: false, message: "Invalid Entry Id" });
  }

  try {
    //  upalod photo to supabase post_image folder and get the url and save it to the database
    const { data, error } = await supabase.storage
      .from("post_image")
      .upload(`post_image/${req.file.originalname}`, req.file);

    if (error) {
      console.log("Error uploading image", error.message);
      return res.status(500).json({ success: false, message: "Server Error" });
    }

    const updatedEntry = await Entry.findByIdAndUpdate(id, entry, {
      new: true,
    });
    res.status(200).json({ success: true, data: updatedEntry });
    // console.log("Product Updated", updatedProduct);
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// delete product
export const deleteEntry = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(404)
      .json({ success: false, message: "Invalid Entry Id" });
  }

  try {
    await Entry.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Entry deleted" });
  } catch (error) {
    console.error("Error in deleting entry", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// like product
export const likeEntry = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid Entry Id" });
  }

  try {
    const entry = await Entry.findById(id);
    if (!entry) {
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    }

    entry.likes = (entry.likes || 0) + 1;
    await entry.save();

    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    console.error("Error in liking entry:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const commentEntry = async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid Entry Id" });
  }

  try {
    const entry = await Entry.findById(id);
    if (!entry) {
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    }

    const newComment = {
      text: comment,
      timestamp: new Date(),
    };

    entry.comments.push(newComment);
    await entry.save();

    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    console.error("Error in commenting entry:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
