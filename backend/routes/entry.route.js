import express from "express";
import multer from "multer";
import {
  createEntry,
  deleteEntry,
  getEntrys,
  updateEntry,
  likeEntry,
  commentEntry,
  // handleFileUpload,
} from "../controllers/entry.controller.js";
import mongoose from "mongoose";
import Entry from "../models/entry.model.js";

import { supabase } from "../supabase/supabase.js";
// import User from "../models/user.model.js";
import { verifyIdToken } from "../middleware/auth.js"; //

const router = express.Router();
// const storage = multer.memoryStorage();
// const upload = multer({ storage });

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
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
    fieldSize: 5 * 1024 * 1024, // 2MB field size limit
  },
});
const uploadMiddleware = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
    fieldSize: 5 * 1024 * 1024, // 2MB field size limit
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

router.get("/", getEntrys);
router.post("/", createEntry);
// router.post(
//   "/:id",
//   verifyIdToken,
//   updateEntry,
//   upload.single("image"),
//   handleFileUpload
// );
router.delete("/:id", deleteEntry);
router.post("/:id/like", likeEntry);
router.post("/:id/comment", commentEntry);

router.post(
  "/:id",
  verifyIdToken,
  upload.single("image"), // Only use this middleware
  async (req, res) => {
    // console.log("Request received");
    const { pid, name, description, image, imageName } = req.body;
    const { uid } = req.user;

    if (!name && !description) {
      // console.log("Missing fields:", { name, description });
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      let postImageUrl = null;

      if (req.file) {
        console.log("file route!!");
        // Handle file upload
        const filePath = `images/image_${uid}/${imageName}_${Date.now()}.jpg`;
        const { error } = await supabase.storage
          .from("post_images")
          .upload(filePath, req.file.buffer, {
            contentType: "image/jpeg",
            cacheControl: "3600",
            upsert: true,
          });

        if (error) {
          console.error("Supabase upload error details:", error);
          return res.status(500).json({
            error: "Failed to upload image",
            details: error.message,
          });
        }

        postImageUrl = `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/post_images/${filePath}`;
      } else if (imageName !== "undefined" || imageName !== "") {
        console.log("image name ", imageName);
        console.log("image route!!");
        // Handle base64 image
        const base64Data = image.split(";base64,").pop();
        const imageBuffer = Buffer.from(base64Data, "base64");
        const filePath = `images/image_${uid}/${imageName}_${Date.now()}.jpg`;
        // const filePath = `images/image_${uid}_${Date.now()}.jpg`;

        const { error } = await supabase.storage
          .from("post_images")
          .upload(filePath, imageBuffer, {
            contentType: "image/jpeg",
            cacheControl: "3600",
            upsert: true,
          });

        if (error) {
          console.error("Supabase upload error details:", error);
          return res.status(500).json({
            error: "Failed to upload image",
            details: error.message,
          });
        }

        postImageUrl = `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/post_images/${filePath}`;
      }

      // Update the entry in the database
      const entryData = await Entry.findByIdAndUpdate(
        pid,
        {
          name,
          description,
          ...(postImageUrl && { image: postImageUrl }), // Only update image if it exists
        },
        { new: true }
      );

      res.status(200).json({ success: true, data: entryData });
    } catch (error) {
      console.error("Error in updating entry:", error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);
// router.post(
//   "/:id",
//   verifyIdToken,
//   upload.single("image"),
//   async (req, res) => {
//     console.log("Request received");
//     // console.log("req.body", req.body);
//     const imageUrl = req.imageUrl; // Get the image URL from handleFileUpload
//     const { pid, name, description, image } = req.body; // Extract fields directly from req.body
//     const { uid } = req.user;

//     if (!name && !description) {
//       console.log("Missing fields:", { name, description });
//       return res.status(400).json({ error: "Missing required fields" });
//     }

//     try {
//       let postImageUrl = null;

//       if (image) {
//         const base64Data = image.split(";base64,").pop();
//         const imageBuffer = Buffer.from(base64Data, "base64");
//         const timestamp = Date.now();
//         const filePath = `images/image_${uid}_${timestamp}.jpg`;

//         const { data: file, error } = await supabase.storage
//           .from("post_images")
//           .upload(filePath, imageBuffer, {
//             contentType: "image/jpeg",
//             cacheControl: "3600",
//             upsert: true,
//           });

//         if (error) {
//           console.error("Supabase upload error details:", error);
//           return res.status(500).json({
//             error: "Failed to upload image",
//             details: error.message,
//           });
//         }

//         postImageUrl = `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/post_images/${filePath}`;
//         // console.log("Generated URL:", postImageUrl);
//       }
//       // console.log("post URL", entryData.postImageUrl);
//       // Update the entry in the database
//       const entryData = await Entry.findByIdAndUpdate(
//         pid,
//         {
//           name,
//           description,
//           ...(postImageUrl && { image: postImageUrl }), // Only update image if it exists
//         },
//         { new: true }
//       );

//       res.status(200).json({ success: true, data: entryData });
//     } catch (error) {
//       console.error("Error in updating entry:", error.message);
//       res.status(500).json({ success: false, message: "Server Error" });
//     }
//   }
// );

export default router;
