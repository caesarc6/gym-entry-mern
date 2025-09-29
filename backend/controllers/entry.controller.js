// import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import Entry from "../models/entry.model.js";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import { supabase } from "../supabase/supabase.js";
// import User from "../models/user.model.js";
import { verifyIdToken } from "../middleware/auth.js"; //
import { generateSafeFilePath } from "../utils/fileUtils.js";

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"), false);
  }
};

// Define multer middleware at the top level
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 5MB file size limit
    fieldSize: 20 * 1024 * 1024, // 2MB field size limit
  },
});
const uploadMiddleware = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 5MB file size limit
    fieldSize: 20 * 1024 * 1024, // 2MB field size limit
  },
}).single("image");

// Middleware to handle file upload errors
export const handleFileUpload = (req, res, next) => {
  if (!req.file) {
    return next(); // No file uploaded, skip to the next middleware
  }

  // Check for Multer errors
  if (req.fileError) {
    if (req.fileError instanceof multer.MulterError) {
      if (req.fileError.code === "LIMIT_FIELD_VALUE") {
        return res.status(400).json({
          message: "File too large. Please upload a smaller image (max 10MB).",
        });
      }
    } else {
      return res.status(400).json({
        error: req.fileError.message,
      });
    }
  }

  // Log the request body and file for debugging
  // console.log("Request body:", req.body);
  // console.log("Request file:", req.file);

  // Proceed to the next middleware
  next();
};

// get all products
export const getEntrys = async (req, res) => {
  try {
    const entrys = await Entry.find({});
    res.status(200).json({ success: true, data: entrys });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// create product
export const createEntry = async (req, res) => {
  const entry = req.body; // user will send this data
  const { uid } = req.user; // Get the authenticated user's UID

  if (!entry.name && !entry.description) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide Name and Description" });
  }

  // Set the uid from the authenticated user
  entry.uid = uid;

  const newEntry = new Entry(entry);

  try {
    await newEntry.save();
    res.status(201).json({ success: true, data: newEntry });
  } catch (error) {
    // console.error("Error in Create entry:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// update workout entry
export const updateEntry = async (req, res) => {
  const { pid, name, description, image, imageName } = req.body; // Extract fields directly from req.body
  const { uid } = req.user;

  // Check if at least one of the fields (name or description) is provided
  if (!name) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    let postImageUrl = null;

    // Check if a new image is provided
    if (imageName !== "undefined") {
      const base64Data = image.split(";base64,").pop();
      const imageBuffer = Buffer.from(base64Data, "base64");
      const filePath = generateSafeFilePath(uid, imageName, "images");

      // Upload the new image to Supabase storage
      const { data: file, error } = await supabase.storage
        .from("post_images")
        .upload(filePath, imageBuffer, {
          contentType: "image/jpeg",
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        return res.status(500).json({
          error: "Failed to upload image",
          details: error.message,
        });
      }

      // Generate the URL for the newly uploaded image
      postImageUrl = `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/post_images/${filePath}`;
    }

    // Prepare the update object
    const updateData = {
      ...(name && { name }), // Only include name if it's provided
      ...(description && { description }), // Only include description if it's provided
      ...(postImageUrl && { image: postImageUrl }), // Only include image URL if a new image is uploaded
    };

    // Update the entry in the database
    const entryData = await Entry.findByIdAndUpdate(pid, updateData, {
      new: true,
    });

    console.log("Updated entry data:", entryData); // Debug log
    res.status(200).json({ success: true, data: entryData });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// PUT route handler for updating entries
export const updateEntryPut = async (req, res) => {
  const { id } = req.params; // Get ID from URL params
  const { name, description, image, imageName } = req.body; // Extract fields from req.body

  // Check if user is authenticated
  if (!req.user || !req.user.uid) {
    console.error("User not authenticated or missing uid:", req.user);
    return res.status(401).json({
      success: false,
      message: "User not authenticated",
    });
  }

  const { uid } = req.user;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(404)
      .json({ success: false, message: "Invalid Entry Id" });
  }

  // Check if at least one of the fields (name or description) is provided
  if (!name) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  try {
    // First, check if the entry exists and if the user is the owner
    const existingEntry = await Entry.findById(id);

    if (!existingEntry) {
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    }

    // Check if the user is the owner of the entry
    if (existingEntry.uid !== uid) {
      return res
        .status(403)
        .json({ success: false, message: "You can only edit your own posts" });
    }

    let postImageUrl = null;

    // Handle image upload if provided
    if (imageName && imageName !== "undefined" && image) {
      const base64Data = image.split(";base64,").pop();
      const imageBuffer = Buffer.from(base64Data, "base64");
      const filePath = generateSafeFilePath(uid, imageName, "images");

      // Upload the new image to Supabase storage
      const { data: file, error } = await supabase.storage
        .from("post_images")
        .upload(filePath, imageBuffer, {
          contentType: "image/jpeg",
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        console.error("Supabase upload error:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to upload image",
          details: error.message,
        });
      }

      // Generate the URL for the newly uploaded image
      postImageUrl = `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/post_images/${filePath}`;
    }

    // Prepare the update object
    const updateData = {
      ...(name && { name }), // Only include name if it's provided
      ...(description && { description }), // Only include description if it's provided
      ...(postImageUrl && { image: postImageUrl }), // Only include image URL if a new image is uploaded
    };

    // Update the entry in the database
    const entryData = await Entry.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    console.log("PUT Updated entry data:", entryData); // Debug log
    console.log("PUT route - postImageUrl:", postImageUrl); // Debug log
    res.status(200).json({ success: true, data: entryData });
  } catch (error) {
    console.error("Error in updating entry:", error.message);
    console.error("Full error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// delete product
export const deleteEntry = async (req, res) => {
  const { id } = req.params;
  const { uid } = req.user;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(404)
      .json({ success: false, message: "Invalid Entry Id" });
  }

  try {
    // First, check if the entry exists and if the user is the owner
    const existingEntry = await Entry.findById(id);

    if (!existingEntry) {
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    }

    // Check if the user is the owner of the entry
    if (existingEntry.uid !== uid) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own posts",
      });
    }

    await Entry.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Entry deleted" });
  } catch (error) {
    // console.error("Error in deleting entry", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// like product
export const likeEntry = async (req, res) => {
  const { id } = req.params;
  const { uid } = req.user; // Get the current user's ID

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

    // Find the user by UID
    const user = await mongoose.model("User").findOne({ uid });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Ensure likes is always an array
    if (!Array.isArray(entry.likes)) {
      entry.likes = [];
    }

    // Clean up any malformed comments that might cause validation errors
    if (Array.isArray(entry.comments)) {
      entry.comments = entry.comments.filter(
        (comment) => comment && comment.uid && comment.text
      );
    }

    // Check if user has already liked the post (by ObjectId)
    const userLikedIndex = entry.likes.findIndex((likeId) =>
      likeId.equals(user._id)
    );

    if (userLikedIndex > -1) {
      // User has already liked the post, so unlike it
      entry.likes.splice(userLikedIndex, 1);
      await entry.save();
      // Populate likes with user info
      await entry.populate("likes", "uid name username picture");
      res.status(200).json({
        success: true,
        message: "Post unliked successfully",
        liked: false,
        likes: entry.likes,
        data: entry,
      });
    } else {
      // User hasn't liked the post, so like it
      entry.likes.push(user._id);
      await entry.save();
      // Populate likes with user info
      await entry.populate("likes", "uid name username picture");
      res.status(200).json({
        success: true,
        message: "Post liked successfully",
        liked: true,
        likes: entry.likes,
        data: entry,
      });
    }
  } catch (error) {
    console.error("Error in liking/unliking entry:", error.message);
    console.error("Full error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const commentEntry = async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;
  const { uid } = req.user;

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

    // Find the user by UID
    const user = await mongoose.model("User").findOne({ uid });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const newComment = {
      _id: new mongoose.Types.ObjectId(),
      text: comment,
      createdAt: new Date(),
      uid: user.uid,
      username: user.username,
      name: user.name,
      picture: user.picture,
      likes: [],
      replies: [],
    };

    if (!Array.isArray(entry.comments)) {
      entry.comments = [];
    }

    entry.comments.push(newComment);
    await entry.save();

    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    console.error("Error in commenting entry:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Like a comment
export const likeComment = async (req, res) => {
  const { entryId, commentId } = req.params;
  const { uid } = req.user;

  if (
    !mongoose.Types.ObjectId.isValid(entryId) ||
    !mongoose.Types.ObjectId.isValid(commentId)
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid Entry or Comment Id" });
  }

  try {
    const entry = await Entry.findById(entryId);
    if (!entry) {
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    }

    const user = await mongoose.model("User").findOne({ uid });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const comment = entry.comments.id(commentId);
    if (!comment) {
      return res
        .status(404)
        .json({ success: false, message: "Comment not found" });
    }

    if (!Array.isArray(comment.likes)) {
      comment.likes = [];
    }

    const userLikedIndex = comment.likes.findIndex((like) => like.uid === uid);

    if (userLikedIndex > -1) {
      // Unlike
      comment.likes.splice(userLikedIndex, 1);
    } else {
      // Like
      comment.likes.push({
        uid: user.uid,
        username: user.username,
        name: user.name,
        picture: user.picture,
      });
    }

    await entry.save();
    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    console.error("Error liking comment:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Reply to a comment
export const replyToComment = async (req, res) => {
  const { entryId, commentId } = req.params;
  const { text } = req.body;
  const { uid } = req.user;

  if (
    !mongoose.Types.ObjectId.isValid(entryId) ||
    !mongoose.Types.ObjectId.isValid(commentId)
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid Entry or Comment Id" });
  }

  try {
    const entry = await Entry.findById(entryId);
    if (!entry) {
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    }

    const user = await mongoose.model("User").findOne({ uid });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const comment = entry.comments.id(commentId);
    if (!comment) {
      return res
        .status(404)
        .json({ success: false, message: "Comment not found" });
    }

    if (!Array.isArray(comment.replies)) {
      comment.replies = [];
    }

    const newReply = {
      _id: new mongoose.Types.ObjectId(),
      text,
      createdAt: new Date(),
      uid: user.uid,
      username: user.username,
      name: user.name,
      picture: user.picture,
    };

    comment.replies.push(newReply);
    await entry.save();

    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    console.error("Error replying to comment:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Edit a comment
export const editComment = async (req, res) => {
  const { entryId, commentId } = req.params;
  const { text } = req.body;
  const { uid } = req.user;

  if (
    !mongoose.Types.ObjectId.isValid(entryId) ||
    !mongoose.Types.ObjectId.isValid(commentId)
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid Entry or Comment Id" });
  }

  try {
    const entry = await Entry.findById(entryId);
    if (!entry) {
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    }

    const comment = entry.comments.id(commentId);
    if (!comment) {
      return res
        .status(404)
        .json({ success: false, message: "Comment not found" });
    }

    // Check if user can edit this comment (comment owner or post owner)
    if (comment.uid !== uid && entry.uid !== uid) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to edit this comment",
      });
    }

    comment.text = text;
    comment.edited = true;
    await entry.save();

    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    console.error("Error editing comment:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Cleanup malformed comments in all entries (utility function)
export const cleanupMalformedComments = async (req, res) => {
  try {
    const entries = await Entry.find({});
    let updatedCount = 0;

    for (const entry of entries) {
      let needsUpdate = false;

      if (Array.isArray(entry.comments)) {
        const originalLength = entry.comments.length;
        entry.comments = entry.comments.filter(
          (comment) => comment && comment.uid && comment.text
        );

        if (entry.comments.length !== originalLength) {
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await entry.save();
        updatedCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Cleaned up malformed comments in ${updatedCount} entries`,
      updatedCount,
    });
  } catch (error) {
    console.error("Error cleaning up malformed comments:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Delete a comment
export const deleteComment = async (req, res) => {
  const { entryId, commentId } = req.params;
  const { uid } = req.user;

  if (
    !mongoose.Types.ObjectId.isValid(entryId) ||
    !mongoose.Types.ObjectId.isValid(commentId)
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid Entry or Comment Id" });
  }

  try {
    const entry = await Entry.findById(entryId);
    if (!entry) {
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    }

    const comment = entry.comments.id(commentId);
    if (!comment) {
      return res
        .status(404)
        .json({ success: false, message: "Comment not found" });
    }

    // Check if user can delete this comment (comment owner or post owner)
    if (comment.uid !== uid && entry.uid !== uid) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this comment",
      });
    }

    comment.remove();
    await entry.save();

    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Generate a shareable link for a workout
export const generateShareLink = async (req, res) => {
  try {
    const { entryId } = req.params;
    const { uid } = req.user;

    // Find the entry
    const entry = await Entry.findById(entryId);
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Entry not found",
      });
    }

    // Check if user owns the entry
    if (entry.uid !== uid) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to share this entry",
      });
    }

    // Generate a unique share token
    const shareToken = new mongoose.Types.ObjectId().toString();
    const shareExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Update the entry with sharing information
    entry.shareable = true;
    entry.shareToken = shareToken;
    entry.shareExpiry = shareExpiry;
    await entry.save();

    const shareUrl = `${
      process.env.FRONTEND_URL || "http://localhost:3000"
    }/workout/${shareToken}`;

    res.status(200).json({
      success: true,
      message: "Share link generated successfully",
      data: {
        shareToken,
        shareUrl,
        expiryDate: shareExpiry,
      },
    });
  } catch (error) {
    console.error("Error generating share link:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Get a shared workout by token (public endpoint)
export const getSharedWorkout = async (req, res) => {
  try {
    const { shareToken } = req.params;

    // Find the entry by share token
    const entry = await Entry.findOne({
      shareToken,
      shareable: true,
      shareExpiry: { $gt: new Date() }, // Check if not expired
    }).populate("originalEntryId");

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Shared workout not found or expired",
      });
    }

    // Get the creator's profile information
    const creatorProfile = await getUserProfileForSharing(entry.uid);

    res.status(200).json({
      success: true,
      data: {
        entry: {
          _id: entry._id,
          name: entry.name,
          description: entry.description,
          image: entry.image,
          createdAt: entry.createdAt,
          likes: entry.likes,
          comments: entry.comments,
        },
        creator: creatorProfile,
        shareToken,
      },
    });
  } catch (error) {
    console.error("Error getting shared workout:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Save a shared workout to user's account
export const saveSharedWorkout = async (req, res) => {
  try {
    const { shareToken } = req.params;
    const { uid } = req.user;

    // Find the shared entry
    const originalEntry = await Entry.findOne({
      shareToken,
      shareable: true,
      shareExpiry: { $gt: new Date() },
    });

    if (!originalEntry) {
      return res.status(404).json({
        success: false,
        message: "Shared workout not found or expired",
      });
    }

    // Check if user already saved this workout
    const existingEntry = await Entry.findOne({
      uid,
      originalEntryId: originalEntry._id,
    });

    if (existingEntry) {
      return res.status(400).json({
        success: false,
        message: "You have already saved this workout",
      });
    }

    // Create a new entry for the current user
    const newEntry = new Entry({
      name: originalEntry.name,
      description: originalEntry.description,
      image: originalEntry.image,
      uid: uid,
      originalEntryId: originalEntry._id,
      likes: [],
      comments: [],
    });

    await newEntry.save();

    res.status(201).json({
      success: true,
      message: "Workout saved to your account successfully",
      data: newEntry,
    });
  } catch (error) {
    console.error("Error saving shared workout:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Helper function to get user profile for sharing
const getUserProfileForSharing = async (uid) => {
  try {
    // This would typically fetch from your user service
    // For now, return basic info
    return {
      uid,
      name: "Workout Creator", // You can enhance this with actual user data
      username: null,
    };
  } catch (error) {
    console.error("Error getting user profile for sharing:", error);
    return {
      uid,
      name: "Anonymous",
      username: null,
    };
  }
};
