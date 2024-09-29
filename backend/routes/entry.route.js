import express from "express";

import {
  createEntry,
  deleteEntry,
  getEntrys,
  updateEntry,
  likeEntry,
  commentEntry,
} from "../controllers/entry.controller.js";

const router = express.Router();

router.get("/", getEntrys);
router.post("/", createEntry);
router.put("/:id", updateEntry);
router.delete("/:id", deleteEntry);
router.post("/:id/like", likeEntry);
router.post("/:id/comment", commentEntry);

export default router;
