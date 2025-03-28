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
  // uploadProfilePic,
  // updateUserProfile,
  // handleFileUpload,
} from "../controllers/user.controller.js";
import { verifyIdToken } from "../middleware/auth.js"; // Middleware to verify Firebase ID token
import { get } from "mongoose";
import User from "../models/user.model.js";
import { supabase } from "../supabase/supabase.js";
import path from "path";

const router = express.Router();
const storage = multer.memoryStorage();
// const upload = multer({ storage });

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
}).single("profileImage");

// export const handleFileUpload = (req, res, next) => {
//   upload.single("profileImage")(req, res, (err) => {
//     if (err instanceof multer.MulterError) {
//       if (err.code === "LIMIT_FIELD_VALUE") {
//         return res.status(400).json({
//           message: "File too large. Please upload a smaller image (max 10MB).",
//         });
//       }
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
// router.post(
//   "/updateUserProfile",
//   verifyIdToken,
//   updateUserProfile,
//   upload.single("profileImage"),
//   handleFileUpload
// );
router.get("/getCurrentMongoDBUser", verifyIdToken, getCurrentMongoDBUser);
router.post(
  "/updateUserBackgroundPicture",
  verifyIdToken,
  upload.single("backgroundPicture"),
  async (req, res) => {
    try {
      const { uid } = req.user;
      const { backgroundPictureName, backgroundPicture } = req.body;

      if (!backgroundPicture && !req.file) {
        return res.status(400).json({
          success: false,
          message: "No data provided for update",
        });
      }

      let backgroundPictureUrl = null;

      if (backgroundPictureName !== "undefined") {
        const base64Data = backgroundPicture.split(";base64,").pop();
        const imageBuffer = Buffer.from(base64Data, "base64");
        const timestamp = Date.now();
        const filePath = `profiles/profile_${uid}/_backgroundProfile/${backgroundPictureName}_${timestamp}.jpg`;

        const { error } = await supabase.storage
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

        backgroundPictureUrl = `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/user_profiles/${filePath}`;
      }

      if (req.file) {
        const timestamp = Date.now();
        const filePath = `profiles/profile_${uid}/_backgroundProfile/file_${timestamp}.jpg`;

        const { error } = await supabase.storage
          .from("user_profiles")
          .upload(filePath, req.file.buffer, {
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

        backgroundPictureUrl = `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/user_profiles/${filePath}`;
      }

      const user = await User.findOneAndUpdate(
        { uid },
        { $set: { backgroundPicture: backgroundPictureUrl } },
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
        message: "Background picture updated successfully",
        data: user,
      });
    } catch (error) {
      console.error("Update background picture error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

router.post(
  "/updateUserProfile",
  verifyIdToken,
  upload.single("profileImage"),
  async (req, res) => {
    try {
      const { uid } = req.user;
      const { name, goal, gymName, bio, profileImageName, profileImage } =
        req.body;

      if (!name && !goal && !gymName && !bio && !profileImage && !req.file) {
        return res.status(400).json({
          success: false,
          message: "No data provided for update",
        });
      }

      let profileImageUrl = null;

      // Handle base64 image upload
      if (profileImageName !== "undefined") {
        const base64Data = profileImage.split(";base64,").pop();
        const imageBuffer = Buffer.from(base64Data, "base64");
        const timestamp = Date.now();
        const filePath = `profiles/profile_${uid}/${profileImageName}_${timestamp}.jpg`;

        const { error } = await supabase.storage
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

        profileImageUrl = `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/user_profiles/${filePath}`;
      }

      // Handle file upload
      if (req.file) {
        const timestamp = Date.now();
        const filePath = `profiles/profile_${uid}/file_${timestamp}.jpg`;

        const { error } = await supabase.storage
          .from("user_profiles")
          .upload(filePath, req.file.buffer, {
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

        profileImageUrl = `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/user_profiles/${filePath}`;
      }

      // Update user profile
      const updateData = {};
      if (name) updateData.name = name;
      if (goal) updateData.goal = goal;
      if (gymName) updateData.gymName = gymName;
      if (bio) updateData.bio = bio;
      if (profileImageUrl) updateData.picture = profileImageUrl;

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

// router.post(
//   "/updateUserProfile",
//   verifyIdToken,
//   upload.single("profileImage"),
//   async (req, res) => {
//     try {
//       const { uid } = req.user;

//       // Use promisified version of multer middleware
//       await new Promise((resolve, reject) => {
//         uploadMiddleware(req, res, (err) => {
//           if (err) {
//             reject(err);
//           }
//           resolve();
//         });
//       });

//       // Extract fields from form data
//       const { name, goal, gymName, bio, profileImageName, profileImage } =
//         req.body;
//       console.log("req.body.profileImage", req.body.profileImage);
//       console.log("req.body.profileImageName", req.body.profileImageName);
//       // Validate that at least one field is provided
//       if (!name && !goal && !gymName && !bio && !profileImage) {
//         return res.status(400).json({
//           success: false,
//           message: "No data provided for update",
//         });
//       }

//       // Handle profile picture upload if present
//       if (profileImageName !== "undefined") {
//         try {
//           // Remove data:image/jpeg;base64, or similar prefix if present
//           const base64Data = profileImage.split(";base64,").pop();

//           // Convert base64 to buffer
//           const imageBuffer = Buffer.from(base64Data, "base64");

//           // Create a simple file path with timestamp
//           const timestamp = Date.now();
//           const filePath = `profiles/profile_${uid}/${profileImageName}_${timestamp}.jpg`;

//           console.log("Debug - Upload attempt with path:", filePath);

//           // Upload to Supabase with error handling
//           const { data: file, error } = await supabase.storage
//             .from("user_profiles")
//             .upload(filePath, imageBuffer, {
//               contentType: "image/jpeg",
//               cacheControl: "3600",
//               upsert: true,
//             });

//           if (error) {
//             console.error("Supabase upload error details:", error);
//             return res.status(500).json({
//               error: "Failed to upload image",
//               details: error.message,
//             });
//           }

//           const profileImageUrl = `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/user_profiles/profiles/${filePath}`;
//           console.log("Debug - Generated URL:", profileImageUrl);

//           await User.findOneAndUpdate(
//             { uid: uid.trim() },
//             { $set: { picture: profileImageUrl } },
//             { new: true }
//           );
//         } catch (error) {
//           console.error("Detailed upload error:", error);
//           return res.status(500).json({
//             success: false,
//             message: "Failed to upload image",
//             details: error.message,
//           });
//         }
//       }

//       // Build update object with only provided fields
//       const updateData = {};
//       if (name) updateData.name = name;
//       if (goal) updateData.goal = goal;
//       if (gymName) updateData.gymName = gymName;
//       if (bio) updateData.bio = bio;

//       // Update user in database with error handling
//       const user = await User.findOneAndUpdate(
//         { uid },
//         { $set: updateData },
//         { new: true }
//       );

//       if (!user) {
//         return res.status(404).json({
//           success: false,
//           message: "User not found",
//         });
//       }

//       // res.status(200).json({
//       //   success: true,
//       //   message: "Profile updated successfully",
//       //   data: user,
//       // });
//     } catch (error) {
//       console.error("Update user profile error:", error);
//       res.status(500).json({
//         success: false,
//         message: error.message,
//       });
//     }
//   }
// );

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

// router.post(
//   "/upload/uploadProfilePic",
//   verifyIdToken,
//   handleFileUpload,
//   async (req, res) => {
//     try {
//       // console.log("Request user REQ:", req);
//       // console.log("Request user USER:", req.user);
//       const { uid } = req.user;
//       const { name, goal, gymName, postsCount, bio } = req.body;
//       let profileImageUrl = null;

//       // const fileName = `profile_${Date.now()}`;
//       if (req.file) {
//         const fileName = `profile_${uid}_${Date.now()}${path.extname(
//           req.file.originalname
//         )}`;
//         const filePath = `profiles/${fileName}`;

//         // const fileName = `profile_${uid}_${Date.now()}${path.extname(
//         //   req.file.originalname
//         // )}`;
//         // const filePath = `profiles/${fileName}`;

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

//         const id = req.user.uid;
//         const trimmed_id = id.trim();
//         const picture = `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/user_profiles/${filePath}`;

//         const updatedUser = await User.findOneAndUpdate(
//           { uid: trimmed_id },
//           { $set: { picture: picture } },
//           { new: true }
//         );

//         console.log("Updated user:", updatedUser);
//         // console.log("req.user._id:", req.user.uid);

//         res.json({
//           url: `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/user_profiles/${filePath}`,
//           path: filePath,
//           user: updatedUser,
//           publicUrl: publicUrl,
//         });
//       }
//     } catch (error) {
//       console.error("Upload error:", error);
//       res.status(500).json({ error: error.message });
//     }
//   }
// );

export default router;
