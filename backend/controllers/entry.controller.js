// import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import Entry from "../models/entry.model.js";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import { supabase } from "../supabase/supabase.js";
// import User from "../models/user.model.js";
import { verifyIdToken } from "../middleware/auth.js"; //

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

// get all products
export const getEntrys = async (req, res) => {
  try {
    const entrys = await Entry.find({});
    res.status(200).json({ success: true, data: entrys });
  } catch (error) {
    console.log("Error in Fetching entries", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// create product
export const createEntry = async (req, res) => {
  const entry = req.body; // user will send this data

  if (!entry.name && !entry.description) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide Name and Description" });
  }

  const newEntry = new Entry(entry);

  try {
    await newEntry.save();
    res.status(201).json({ success: true, data: newEntry });
  } catch (error) {
    // console.error("Error in Create entry:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// update workout entry
export const updateEntry = async (req, res) => {
  const { pid, name, description, image, imageName } = req.body; // Extract fields directly from req.body
  const { uid } = req.user;

  // Check if at least one of the fields (name or description) is provided
  if (!name) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    let postImageUrl = null;

    // Check if a new image is provided
    if (imageName !== "undefined") {
      const base64Data = image.split(";base64,").pop();
      const imageBuffer = Buffer.from(base64Data, "base64");
      const timestamp = Date.now();
      const filePath = `images/image_${uid}/${imageName}_${timestamp}.jpg`;

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
    }

    // Prepare the update object
    const updateData = {
      ...(name && { name }), // Only include name if it's provided
      ...(description && { description }), // Only include description if it's provided
      ...(postImageUrl && { image: postImageUrl }), // Only include image URL if a new image is uploaded
    };

    // Update the entry in the database
    const entryData = await Entry.findByIdAndUpdate(pid, updateData, {
      new: true,
    });

    res.status(200).json({ success: true, data: entryData });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Update Post
// export const updateEntry = async (req, res) => {
//   // console.log("Request received");
//   // console.log("req.body", req.body);
//   const imageUrl = req.imageUrl; // Get the image URL from handleFileUpload
//   const { pid, name, description, image } = req.body; // Extract fields directly from req.body
//   const { uid } = req.user;

//   if (!name && !description) {
//     // console.log("Missing fields:", { name, description });
//     return res.status(400).json({ error: "Missing required fields" });
//   }
//   await new Promise((resolve, reject) => {
//     uploadMiddleware(req, res, (err) => {
//       if (err) {
//         reject(err);
//       }
//       resolve();
//     });
//   });

//   try {
//     let postImageUrl = null;

//     if (image) {
//       const base64Data = image.split(";base64,").pop();
//       const imageBuffer = Buffer.from(base64Data, "base64");
//       const timestamp = Date.now();
//       const filePath = `images/image_${uid}_${timestamp}.jpg`;

//       const { data: file, error } = await supabase.storage
//         .from("post_images")
//         .upload(filePath, imageBuffer, {
//           contentType: "image/jpeg",
//           cacheControl: "3600",
//           upsert: true,
//         });

//       if (error) {
//         // console.error("Supabase upload error details:", error);
//         return res.status(500).json({
//           error: "Failed to upload image",
//           details: error.message,
//         });
//       }

//       postImageUrl = `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/post_images/${filePath}`;
//       // console.log("Generated URL:", postImageUrl);
//     }
//     // console.log("post URL", entryData.postImageUrl);
//     // Update the entry in the database
//     const entryData = await Entry.findByIdAndUpdate(
//       pid,
//       {
//         name,
//         description,
//         ...(postImageUrl && { image: postImageUrl }),
//       },
//       { new: true }
//     );

//     res.status(200).json({ success: true, data: entryData });
//   } catch (error) {
//     // console.error("Error in updating entry:", error.message);
//     res.status(500).json({ success: false, message: "Server Error" });
//   }
// };

// update product
// export const updateEntry = async (req, res) => {
//   const { id } = req.params;
//   const { uid } = req.user;
//   console.log("req.body", req.body);
//   console.log("req.file", req.file);
//   // if req body is empty return error
//   if (!req.body) {
//     return res
//       .status(400)
//       .json({ success: false, message: "Please provide all fields" });
//   }

//   if (!mongoose.Types.ObjectId.isValid(id)) {
//     return res
//       .status(404)
//       .json({ success: false, message: "Invalid Entry Id" });
//   }

//   try {
//     const entry = JSON.parse(req.body.entry);
//     console.log("data form data", entry);

//     let imageUrl = null;
//     if (req.file) {
//       const { data, error } = await supabase.storage
//         .from("post_images")
//         .upload(`post_images/${req.file.originalname}`, req.file.buffer);

//       if (error) {
//         console.log("Error uploading image", error.message);
//         return res
//           .status(500)
//           .json({ success: false, message: "Server Error" });
//       }

//       imageUrl = data.Key;
//     }

//     if (imageUrl) {
//       entry.image = imageUrl;
//     }

//     const updatedEntry = await Entry.findOneAndUpdate(uid, entry, {
//       new: true,
//     });

//     res.status(200).json({ success: true, data: updatedEntry });
//   } catch (error) {
//     console.error("Error in updating entry:", error.message, req.body);
//     res.status(500).json({ success: false, message: "Server Error" });
//   }
// };

// delete product
export const deleteEntry = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(404)
      .json({ success: false, message: "Invalid Entry Id" });
  }

  try {
    await Entry.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Entry deleted" });
  } catch (error) {
    // console.error("Error in deleting entry", error.message);
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

    // Ensure likes is always an array (handle legacy data where likes was a number)
    if (!Array.isArray(entry.likes)) {
      entry.likes = [];
    }

    // Check if user has already liked the post
    const userLikedIndex = entry.likes.findIndex((likeId) => likeId === uid);

    if (userLikedIndex > -1) {
      // User has already liked the post, so unlike it
      entry.likes.splice(userLikedIndex, 1);
      await entry.save();

      res.status(200).json({
        success: true,
        message: "Post unliked successfully",
        liked: false,
        likes: entry.likes.length,
        data: entry,
      });
    } else {
      // User hasn't liked the post, so like it
      entry.likes.push(uid);
      await entry.save();

      res.status(200).json({
        success: true,
        message: "Post liked successfully",
        liked: true,
        likes: entry.likes.length,
        data: entry,
      });
    }
  } catch (error) {
    console.error("Error in liking/unliking entry:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const commentEntry = async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;

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

    const newComment = {
      text: comment,
      timestamp: new Date(),
    };

    entry.comments.push(newComment);
    await entry.save();

    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    // console.error("Error in commenting entry:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
