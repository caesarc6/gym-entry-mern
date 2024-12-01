import express from "express";

import {
  createUser,
  createPost,
  getPostsByUID,
  getUsers,
  getCurrentUser,
  getUser,
  getUserProfile,
  uploadProfilePic,
} from "../controllers/user.controller.js";
import { verifyIdToken } from "../middleware/auth.js"; // Middleware to verify Firebase ID token
import { get } from "mongoose";

const router = express.Router();

router.get("/createUsers", verifyIdToken, createUser);
router.post("/posts", verifyIdToken, createPost);
router.get("/posts/:uid", getPostsByUID);
router.get("/getUsers", verifyIdToken, getUsers);
router.get("/getCurrentUser", verifyIdToken, getCurrentUser);
router.get("/getUser/:uid", getUser);
router.get("/getUserProfile/:uid", verifyIdToken, getUserProfile);
router.post("/upload/uploadProfilePic", verifyIdToken, uploadProfilePic);
// router.post("/uploadProfilePic", verifyIdToken, uploadProfilePic);

export default router;
