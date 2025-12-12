import express from "express";
import multer from "multer";
import {
  createEntry,
  deleteEntry,
  getEntrys,
  updateEntry,
  updateEntryPut,
  likeEntry,
  commentEntry,
  likeComment,
  replyToComment,
  editComment,
  deleteComment,
  cleanupMalformedComments,
  generateShareLink,
  getSharedWorkout,
  saveSharedWorkout,
} from "../controllers/entry.controller.js";
import mongoose from "mongoose";
import Entry from "../models/entry.model.js";
import { supabase } from "../supabase/supabase.js";
import { verifyIdToken } from "../middleware/auth.js"; //

const router = express.Router();

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

  next();
};

router.get("/", getEntrys);
router.post("/", verifyIdToken, createEntry);

// Test route to check if entry routes are working
router.get("/test", (req, res) => {
  res.json({ success: true, message: "Entry routes are working" });
});

// Database connection test route
router.get("/db-test", async (req, res) => {
  try {
    const mongoose = await import("mongoose");
    const Entry = await import("../models/entry.model.js");

    const connectionState = mongoose.connection.readyState;
    const connectionStates = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };

    // Try to count entries to test database access
    const entryCount = await Entry.default.countDocuments();

    res.json({
      success: true,
      message: "Database test completed",
      connectionState: connectionStates[connectionState],
      entryCount: entryCount,
      mongoUri: process.env.MONGO_URI ? "Set" : "Not set",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database test failed",
      error: error.message,
    });
  }
});

router.delete("/:id", verifyIdToken, deleteEntry);
router.post("/:id/like", verifyIdToken, likeEntry);
router.post("/:id/comment", commentEntry);

// Cleanup route for malformed comments (admin utility)
router.post("/cleanup-comments", verifyIdToken, cleanupMalformedComments);

// Comment interaction routes
router.post("/:entryId/comments/:commentId/like", verifyIdToken, likeComment);
router.post(
  "/:entryId/comments/:commentId/reply",
  verifyIdToken,
  replyToComment
);
router.put("/:entryId/comments/:commentId", verifyIdToken, editComment);
router.delete("/:entryId/comments/:commentId", verifyIdToken, deleteComment);

// PUT route for updating entries (frontend expects this)
router.put("/:id", verifyIdToken, updateEntryPut);

// Completely basic PUT route without any database operations
router.put("/:id/basic", (req, res) => {
  res.json({
    success: true,
    message: "Basic PUT route is working",
    id: req.params.id,
    body: req.body,
  });
});

// Simple test PUT route to check if PUT routing works
router.put("/:id/test", (req, res) => {
  res.json({
    success: true,
    message: "PUT route is working",
    id: req.params.id,
    body: req.body,
  });
});

// Sharing routes
router.post("/:entryId/share", verifyIdToken, generateShareLink);
router.get("/shared/:shareToken", getSharedWorkout); // Public endpoint
router.post("/shared/:shareToken/save", verifyIdToken, saveSharedWorkout);

export default router;
