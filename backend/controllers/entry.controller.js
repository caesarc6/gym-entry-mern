// import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import Entry from "../models/entry.model.js";
import { User } from "../models/user.model.js";
import SharedWorkout from "../models/sharedWorkout.model.js";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import { supabase } from "../supabase/supabase.js";
// import User from "../models/user.model.js";
import { verifyIdToken } from "../middleware/auth.js"; //
import {
  generateSafeFilePath,
  removeSupabaseObjectByPublicUrl,
} from "../utils/fileUtils.js";
import { attachPopulatedLikesToEntries } from "../utils/entryLikes.js";
import { ensureMongoConnected } from "../config/db.js";

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

const findUserByAuth = async (authUser) => {
  if (!authUser) return null;
  const conditions = [
    { uid: authUser.uid },
    { firebaseUid: authUser.uid },
    { supabaseUid: authUser.uid },
  ];
  if (authUser.email) {
    conditions.push({ email: authUser.email });
  }
  return User.findOne({ $or: conditions });
};

const getUserUidSet = (user, fallbackUid) => {
  const uids = new Set();
  if (fallbackUid) uids.add(fallbackUid);
  if (user?.uid) uids.add(user.uid);
  if (user?.firebaseUid) uids.add(user.firebaseUid);
  if (user?.supabaseUid) uids.add(user.supabaseUid);
  return uids;
};

const cleanupReplacedPostImage = async ({ previousUrl, newUrl, ownerUid }) => {
  if (!previousUrl || previousUrl === newUrl || !ownerUid) return;

  const result = await removeSupabaseObjectByPublicUrl(
    supabase,
    "post_images",
    previousUrl,
    { expectedPrefix: `images/${ownerUid}/` }
  );

  if (result.error && process.env.NODE_ENV !== "production") {
    console.warn("[storage cleanup] failed to remove replaced post image", {
      path: result.path,
      error: result.error.message,
    });
  }
};

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

  const authUser = await findUserByAuth(req.user);
  const canonicalUid = authUser?.uid || uid;

  // Set the uid from the canonical user
  entry.uid = canonicalUid;

  const newEntry = new Entry(entry);

  try {
    await newEntry.save();
    res.status(201).json({ success: true, data: newEntry });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// update workout entry
export const updateEntry = async (req, res) => {
  const { pid, name, description, image, imageName } = req.body; // Extract fields directly from req.body
  const { uid } = req.user;
  const authUser = await findUserByAuth(req.user);
  const canonicalUid = authUser?.uid || uid;

  // Check if at least one of the fields (name or description) is provided
  if (!name) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const dbReady = await ensureMongoConnected();
    if (!dbReady.ok) {
      return res.status(503).json({
        success: false,
        message: dbReady.message || "Database not ready",
      });
    }

    // Get the entry first to check if it exists and to preserve existing image
    const existingEntry = await Entry.findById(pid);
    if (!existingEntry) {
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    }

    let postImageUrl = null;

    // Check if a new image is provided
    if (imageName && imageName !== "undefined" && image) {
      try {
        const base64Data = image.split(";base64,").pop();
        const imageBuffer = Buffer.from(base64Data, "base64");
        const filePath = generateSafeFilePath(canonicalUid, imageName, "images");

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
      } catch (imageError) {
        return res.status(500).json({
          error: "Failed to process image",
          details: imageError.message,
        });
      }
    }

    // Prepare the update object
    const updateData = {
      ...(name && { name }), // Only include name if it's provided
      ...(description && { description }), // Only include description if it's provided
      ...(postImageUrl
        ? { image: postImageUrl }
        : existingEntry.image
        ? { image: existingEntry.image }
        : {}), // Use new image if uploaded, otherwise preserve existing image
    };

    // Update the entry in the database; clear any in-progress edit draft
    const entryData = await Entry.findByIdAndUpdate(
      pid,
      { $set: updateData, $unset: { editDraft: 1 } },
      { new: true },
    );

    // If this entry is linked to a SharedWorkout, sync the update back to the SharedWorkout
    if (existingEntry.sharedWorkoutId) {
      try {
        const sharedWorkoutUpdates = {};

        // Description is now stored without prefix - trainer info is separate
        if (name) sharedWorkoutUpdates.workoutName = name;
        if (description) sharedWorkoutUpdates.description = description;
        if (postImageUrl) sharedWorkoutUpdates.image = postImageUrl;

        if (Object.keys(sharedWorkoutUpdates).length > 0) {
          // Update the SharedWorkout
          await SharedWorkout.findByIdAndUpdate(
            existingEntry.sharedWorkoutId,
            { $set: sharedWorkoutUpdates },
            { new: true }
          );

          // Also update all other Entry posts linked to this SharedWorkout
          const otherEntryUpdates = {};
          if (name) otherEntryUpdates.name = name;
          if (description) {
            // Description is stored without prefix - trainer info is separate
            otherEntryUpdates.description = description;
          }
          if (postImageUrl) otherEntryUpdates.image = postImageUrl;

          if (Object.keys(otherEntryUpdates).length > 0) {
            await Entry.updateMany(
              {
                sharedWorkoutId: existingEntry.sharedWorkoutId,
                _id: { $ne: pid },
              },
              { $set: otherEntryUpdates }
            );
          }
        }
      } catch (syncError) {
        // Don't fail the request if sync fails, just log it
      }
    }

    if (postImageUrl) {
      await cleanupReplacedPostImage({
        previousUrl: existingEntry.image,
        newUrl: postImageUrl,
        ownerUid: canonicalUid,
      });
    }

    res.status(200).json({ success: true, data: entryData });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/** Owner-only: persist name/description backup while editing (no base64 images). */
export const saveEntryDraft = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body ?? {};

  if (!req.user?.uid) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated",
    });
  }

  const { uid } = req.user;
  const authUser = await findUserByAuth(req.user);
  const uidSet = getUserUidSet(authUser, uid);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(404)
      .json({ success: false, message: "Invalid Entry Id" });
  }

  try {
    const entry = await Entry.findById(id);
    if (!entry) {
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    }
    if (!uidSet.has(entry.uid)) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own posts",
      });
    }

    const nameStr =
      typeof name === "string" ? name : entry.name != null ? String(entry.name) : "";
    const descStr =
      typeof description === "string"
        ? description
        : entry.description != null
          ? String(entry.description)
          : "";

    await Entry.findByIdAndUpdate(id, {
      $set: {
        editDraft: {
          name: nameStr,
          description: descStr,
          updatedAt: new Date(),
        },
      },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

/** Owner-only: read saved edit draft (text only). */
export const getEntryDraft = async (req, res) => {
  const { id } = req.params;

  if (!req.user?.uid) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated",
    });
  }

  const { uid } = req.user;
  const authUser = await findUserByAuth(req.user);
  const uidSet = getUserUidSet(authUser, uid);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(404)
      .json({ success: false, message: "Invalid Entry Id" });
  }

  try {
    const entry = await Entry.findById(id).select("+editDraft uid");
    if (!entry) {
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    }
    if (!uidSet.has(entry.uid)) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own posts",
      });
    }

    const d = entry.editDraft;
    const data = d
      ? {
          name: d.name ?? "",
          description: d.description ?? "",
          updatedAt: d.updatedAt,
        }
      : null;

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

/** Owner-only: remove stored edit draft (e.g. matches published version). */
export const clearEntryDraft = async (req, res) => {
  const { id } = req.params;

  if (!req.user?.uid) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated",
    });
  }

  const { uid } = req.user;
  const authUser = await findUserByAuth(req.user);
  const uidSet = getUserUidSet(authUser, uid);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(404)
      .json({ success: false, message: "Invalid Entry Id" });
  }

  try {
    const entry = await Entry.findById(id).select("uid");
    if (!entry) {
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    }
    if (!uidSet.has(entry.uid)) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own posts",
      });
    }

    await Entry.findByIdAndUpdate(id, { $unset: { editDraft: 1 } });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// PUT route handler for updating entries
export const updateEntryPut = async (req, res) => {
  const { id } = req.params; // Get ID from URL params
  const { name, description, image, imageName } = req.body; // Extract fields from req.body

  // Check if user is authenticated
  if (!req.user || !req.user.uid) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated",
    });
  }

  const { uid } = req.user;
  const authUser = await findUserByAuth(req.user);
  const canonicalUid = authUser?.uid || uid;
  const uidSet = getUserUidSet(authUser, uid);

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
    const dbReady = await ensureMongoConnected();
    if (!dbReady.ok) {
      return res.status(503).json({
        success: false,
        message: dbReady.message || "Database not ready",
      });
    }

    // First, check if the entry exists and if the user is the owner
    const existingEntry = await Entry.findById(id);

    if (!existingEntry) {
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    }

    // Check if the user is the owner of the entry
    if (!uidSet.has(existingEntry.uid)) {
      return res
        .status(403)
        .json({ success: false, message: "You can only edit your own posts" });
    }

    let postImageUrl = null;

    // Handle image upload if provided
    if (imageName && imageName !== "undefined" && image) {
      const base64Data = image.split(";base64,").pop();
      const imageBuffer = Buffer.from(base64Data, "base64");
      const filePath = generateSafeFilePath(canonicalUid, imageName, "images");

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
      ...(postImageUrl
        ? { image: postImageUrl }
        : existingEntry.image
        ? { image: existingEntry.image }
        : {}), // Use new image if uploaded, otherwise preserve existing image
    };

    // Update the entry in the database; clear any in-progress edit draft
    const entryData = await Entry.findByIdAndUpdate(
      id,
      { $set: updateData, $unset: { editDraft: 1 } },
      { new: true },
    );

    // If this entry is linked to a SharedWorkout, sync the update back to the SharedWorkout
    if (existingEntry.sharedWorkoutId) {
      try {
        const sharedWorkoutUpdates = {};

        // Description is now stored without prefix - trainer info is separate
        if (name) sharedWorkoutUpdates.workoutName = name;
        if (description) sharedWorkoutUpdates.description = description;
        if (postImageUrl) sharedWorkoutUpdates.image = postImageUrl;

        if (Object.keys(sharedWorkoutUpdates).length > 0) {
          // Update the SharedWorkout
          await SharedWorkout.findByIdAndUpdate(
            existingEntry.sharedWorkoutId,
            { $set: sharedWorkoutUpdates },
            { new: true }
          );

          // Also update all other Entry posts linked to this SharedWorkout
          const otherEntryUpdates = {};
          if (name) otherEntryUpdates.name = name;
          if (description) {
            // Description is stored without prefix - trainer info is separate
            otherEntryUpdates.description = description;
          }
          if (postImageUrl) otherEntryUpdates.image = postImageUrl;

          if (Object.keys(otherEntryUpdates).length > 0) {
            await Entry.updateMany(
              {
                sharedWorkoutId: existingEntry.sharedWorkoutId,
                _id: { $ne: id },
              },
              { $set: otherEntryUpdates }
            );
          }
        }
      } catch (syncError) {
        // Don't fail the request if sync fails, just log it
      }
    }

    if (postImageUrl) {
      await cleanupReplacedPostImage({
        previousUrl: existingEntry.image,
        newUrl: postImageUrl,
        ownerUid: canonicalUid,
      });
    }

    res.status(200).json({ success: true, data: entryData });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// delete product
export const deleteEntry = async (req, res) => {
  const { id } = req.params;
  const { uid } = req.user;
  const authUser = await findUserByAuth(req.user);
  const uidSet = getUserUidSet(authUser, uid);

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
    if (!uidSet.has(existingEntry.uid)) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own posts",
      });
    }

    await Entry.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Entry deleted" });
  } catch (error) {
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
    const user = await findUserByAuth(req.user);
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

    // Check if user has already liked the post (by ObjectId); skip corrupted like values
    const userLikedIndex = entry.likes.findIndex(
      (likeId) =>
        likeId != null &&
        typeof likeId.equals === "function" &&
        likeId.equals(user._id)
    );

    const sendLikeResponse = async (message, liked) => {
      const payload = entry.toObject();
      await attachPopulatedLikesToEntries([payload]);
      res.status(200).json({
        success: true,
        message,
        liked,
        likes: payload.likes,
        data: payload,
      });
    };

    if (userLikedIndex > -1) {
      entry.likes.splice(userLikedIndex, 1);
      await entry.save();
      await sendLikeResponse("Post unliked successfully", false);
    } else {
      entry.likes.push(user._id);
      await entry.save();
      await sendLikeResponse("Post liked successfully", true);
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const commentEntry = async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

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
    const user = await findUserByAuth(req.user);
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

    res.status(200).json({
      success: true,
      message: "Comment added successfully",
      comments: entry.comments,
      data: entry,
    });
  } catch (error) {
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

    const user = await findUserByAuth(req.user);
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

    const user = await findUserByAuth(req.user);
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
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Edit a comment
export const editComment = async (req, res) => {
  const { entryId, commentId } = req.params;
  const { text } = req.body;
  const { uid } = req.user;
  const authUser = await findUserByAuth(req.user);
  const uidSet = getUserUidSet(authUser, uid);

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
    if (!uidSet.has(comment.uid) && !uidSet.has(entry.uid)) {
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
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Delete a comment
export const deleteComment = async (req, res) => {
  const { entryId, commentId } = req.params;
  const { uid } = req.user;
  const authUser = await findUserByAuth(req.user);
  const uidSet = getUserUidSet(authUser, uid);

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
    if (!uidSet.has(comment.uid) && !uidSet.has(entry.uid)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this comment",
      });
    }

    comment.remove();
    await entry.save();

    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Generate a shareable link for a workout
export const generateShareLink = async (req, res) => {
  try {
    const { entryId } = req.params;
    const { uid } = req.user;
    const authUser = await findUserByAuth(req.user);
    const uidSet = getUserUidSet(authUser, uid);

    // Find the entry
    const entry = await Entry.findById(entryId);
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Entry not found",
      });
    }

    // Check if user owns the entry
    if (!uidSet.has(entry.uid)) {
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
    return {
      uid,
      name: "Anonymous",
      username: null,
    };
  }
};
