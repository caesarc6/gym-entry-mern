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
  uploadProfilePic,
  updateUserProfile,
  handleFileUpload,
} from "../controllers/user.controller.js";
import { verifyIdToken } from "../middleware/auth.js"; // Middleware to verify Firebase ID token
import { get } from "mongoose";
import User from "../models/user.model.js";
import { supabase } from "../supabase/supabase.js";
import path from "path";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get("/createUsers", verifyIdToken, createUser);
router.post("/posts", verifyIdToken, createPost);
router.get("/posts/:uid", getPostsByUID);
router.get("/getUsers", verifyIdToken, getUsers);
router.get("/getCurrentUser", verifyIdToken, getCurrentUser);
router.get("/getUser/:uid", getUser);
router.get("/getUserProfile/:uid", verifyIdToken, getUserProfile);
// router.post(
//   "/updateUserProfile",
//   verifyIdToken,
//   handleFileUpload,
//   updateUserProfile
// );
router.post(
  "/updateUserProfile",
  verifyIdToken,
  updateUserProfile,
  upload.single("profileImage"),
  handleFileUpload
);
router.get("/getCurrentMongoDBUser", verifyIdToken, getCurrentMongoDBUser);

// const handleFileUpload = (req, res, next) => {
//   upload.single("profilePicture")(req, res, (err) => {
//     if (err instanceof multer.MulterError) {
//       return res.status(400).json({
//         error: "File upload error",
//         details: err.message,
//       });
//     } else if (err) {
//       return res.status(400).json({
//         error: err.message,
//       });
//     }

//     if (!req.file) {
//       return res.status(400).json({ error: "No file uploaded" });
//     }

//     console.log("Request body:", req.body);
//     console.log("Request file:", req.file);

//     next();
//   });
// };

router.post(
  "/upload/uploadProfilePic",
  verifyIdToken,
  handleFileUpload,
  async (req, res) => {
    try {
      // console.log("Request user REQ:", req);
      // console.log("Request user USER:", req.user);
      const { uid } = req.user;
      const { name, goal, gymName, postsCount, bio } = req.body;
      let profileImageUrl = null;

      // const fileName = `profile_${Date.now()}`;
      if (req.file) {
        const fileName = `profile_${uid}_${Date.now()}${path.extname(
          req.file.originalname
        )}`;
        const filePath = `profiles/${fileName}`;

        // const fileName = `profile_${uid}_${Date.now()}${path.extname(
        //   req.file.originalname
        // )}`;
        // const filePath = `profiles/${fileName}`;

        const { data, error } = await supabase.storage
          .from("user_profiles")
          .upload(filePath, req.file.buffer, {
            cacheControl: "3600",
            upsert: true,
          });

        if (error) {
          console.error("Supabase upload error:", error);
          return res.status(500).json({ error: "Failed to upload image" });
        }

        const { publicUrl } = supabase.storage
          .from("user_profiles")
          .getPublicUrl(filePath);

        const id = req.user.uid;
        const trimmed_id = id.trim();
        const picture = `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/user_profiles/${filePath}`;

        const updatedUser = await User.findOneAndUpdate(
          { uid: trimmed_id },
          { $set: { picture: picture } },
          { new: true }
        );

        console.log("Updated user:", updatedUser);
        // console.log("req.user._id:", req.user.uid);

        res.json({
          url: `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/user_profiles/${filePath}`,
          path: filePath,
          user: updatedUser,
          publicUrl: publicUrl,
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// router.post(
//   "/updateUserProfile/:uid",
//   verifyIdToken,
//   handleFileUpload,
//   async (req, res) => {
//     // console.log("updateUserProfile");
//     // handleFileUpload, // Middleware to handle file upload
//     console.log("Request body:", req.body);
//     const { uid } = req.user;
//     const { name, goal, gymName, bio } = req.body;

//     try {
//       let profilePicture = null;

//       if (req.file) {
//         const fileName = `profile_${uid}_${Date.now()}${path.extname(
//           req.file.originalname
//         )}`;
//         const filePath = `profiles/${fileName}`;

//         const { data, error } = await supabase.storage
//           .from("user_profiles")
//           .upload(filePath, req.file.buffer, {
//             cacheControl: "3600",
//             upsert: true,
//           });

//         if (error) {
//           console.error("Supabase upload error:", error);
//           return res.status(500).json({ error: "Failed to upload image" });
//         }

//         const { publicUrl } = supabase.storage
//           .from("user_profiles")
//           .getPublicUrl(filePath);

//         profilePicture = {
//           url: publicUrl,
//           storagePath: filePath,
//         };
//       }

//       const updateData = { name, goal, gymName, bio };
//       if (profilePicture) {
//         updateData.picture = profilePicture;
//       }

//       const user = await User.findOneAndUpdate({ uid }, updateData, {
//         new: true,
//       });

//       console.log("Updated user:", user);

//       if (!user) {
//         return res.status(404).json({ error: "User not found" });
//       }

//       res.status(200).json(user);
//     } catch (error) {
//       console.error("Update user profile error:", error);
//       res.status(500).json({ error: error.message });
//     }
//   }
// );

export default router;
