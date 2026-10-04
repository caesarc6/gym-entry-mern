import express from "express";
import multer from "multer";
import {
  deleteEntry,
  updateEntryPut,
  saveEntryDraft,
  getEntryDraft,
  clearEntryDraft,
  likeEntry,
  commentEntry,
  likeComment,
  replyToComment,
  editComment,
  deleteComment,
  generateShareLink,
} from "../controllers/entry.controller.js";
import { verifyIdToken } from "../middleware/auth.js";

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

router.get("/:id/draft", verifyIdToken, getEntryDraft);
router.put("/:id/draft", verifyIdToken, saveEntryDraft);
router.delete("/:id/draft", verifyIdToken, clearEntryDraft);

router.delete("/:id", verifyIdToken, deleteEntry);
router.post("/:id/like", verifyIdToken, likeEntry);
router.post("/:id/comment", verifyIdToken, commentEntry);

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
const optionalEntryImage = (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        message: "Photo is too large. Use a smaller photo.",
      });
    }
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || "Invalid photo",
      });
    }
    next();
  });
};

router.put("/:id", verifyIdToken, optionalEntryImage, updateEntryPut);

// Sharing routes
router.post("/:entryId/share", verifyIdToken, generateShareLink);

export default router;
