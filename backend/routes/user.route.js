import express from "express";
import multer from "multer";
import {
  createUser,
  createPost,
  getPostsByUID,
  getUsers,
  getCurrentUser,
  getUser,
  getUserProfile,
  getCurrentMongoDBUser,
  updateUserProfile,
} from "../controllers/user.controller.js";
import { verifyIdToken } from "../middleware/auth.js";
import User from "../models/user.model.js";
import { supabase } from "../supabase/supabase.js";

const router = express.Router();
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 5MB file size limit
    fieldSize: 10 * 1024 * 1024, // 2MB field size limit
  },
});

const handleFileUpload = (req, res, next) => {
  upload.single("profileImage")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        message: "File too large. Please upload a smaller image (max 5MB).",
      });
    } else if (err) {
      return res.status(400).json({
        error: err.message,
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    next();
  });
};

router.get("/createUsers", verifyIdToken, createUser);
router.post("/posts", verifyIdToken, createPost);
router.get("/posts/:uid", getPostsByUID);
router.get("/getUsers", verifyIdToken, getUsers);
router.get("/getCurrentUser", verifyIdToken, getCurrentUser);
router.get("/getUser/:uid", getUser);
router.get("/getUserProfile/:uid", verifyIdToken, getUserProfile);
router.get("/getCurrentMongoDBUser", verifyIdToken, getCurrentMongoDBUser);

router.post(
  "/updateUserProfile",
  verifyIdToken,
  handleFileUpload,
  async (req, res) => {
    try {
      const { uid } = req.user;
      const { name, goal, gymName, bio, profileImageName, profileImage } =
        req.body;

      if (!name && !goal && !gymName && !bio && !profileImage) {
        return res.status(400).json({
          success: false,
          message: "No data provided for update",
        });
      }

      if (profileImageName && profileImage) {
        const base64Data = profileImage.split(";base64,").pop();
        const imageBuffer = Buffer.from(base64Data, "base64");
        const timestamp = Date.now();
        const filePath = `profiles/profile_${uid}/${profileImageName}_${timestamp}.jpg`;

        const { data: file, error } = await supabase.storage
          .from("user_profiles")
          .upload(filePath, imageBuffer, {
            contentType: "image/jpeg",
            cacheControl: "3600",
            upsert: true,
          });

        if (error) {
          console.error("Supabase upload error:", error);
          return res.status(500).json({
            error: "Failed to upload image",
            details: error.message,
          });
        }

        const profileImageUrl = `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/user_profiles/${filePath}`;
        await User.findOneAndUpdate(
          { uid: uid.trim() },
          { $set: { picture: profileImageUrl } },
          { new: true }
        );
      }

      const updateData = {};
      if (name) updateData.name = name;
      if (goal) updateData.goal = goal;
      if (gymName) updateData.gymName = gymName;
      if (bio) updateData.bio = bio;

      const user = await User.findOneAndUpdate(
        { uid },
        { $set: updateData },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: user,
      });
    } catch (error) {
      console.error("Update user profile error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

export default router;
