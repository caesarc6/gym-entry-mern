import express from "express";
import multer from "multer";
import {
  createEntry,
  deleteEntry,
  getEntrys,
  updateEntry,
  likeEntry,
  commentEntry,
  handleFileUpload,
} from "../controllers/entry.controller.js";
import { verifyIdToken } from "../middleware/auth.js"; //
const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get("/", getEntrys);
router.post("/", createEntry);
router.post(
  "/:id",
  verifyIdToken,
  upload.single("image"),
  handleFileUpload,
  updateEntry
);
router.delete("/:id", deleteEntry);
router.post("/:id/like", likeEntry);
router.post("/:id/comment", commentEntry);

export default router;
