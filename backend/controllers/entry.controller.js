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

const storage = multer.memoryStorage();
const upload = multer({ storage });

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"), false);
  }
};

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
  upload.single("image")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FIELD_VALUE") {
        return res.status(400).json({
          message: "File too large. Please upload a smaller image (max 10MB).",
        });
      }
    } else if (err) {
      return res.status(400).json({
        error: err.message,
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("Request body:", req.body);
    console.log("Request file:", req.file);

    next();
  });
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

  if (!entry.name || !entry.description) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide all fields" });
  }

  const newEntry = new Entry(entry);

  try {
    await newEntry.save();
    res.status(201).json({ success: true, data: newEntry });
  } catch (error) {
    console.error("Error in Create entry:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const updateEntry = async (req, res) => {
  console.log("Request received");
  // console.log("req.body.entry", req);
  const { entry } = req.body;
  console.log("entry", entry);
  console.log("req.body", req.body);
  // const { postImage } = req.body;

  // console.log("postimage", postImage);
  const { image } = req.body;
  console.log("image", image);
  const { pid } = req.body;
  // console.log("id", pid);
  const { uid } = req.user;

  await new Promise((resolve, reject) => {
    uploadMiddleware(req, res, (err) => {
      if (err) {
        reject(err);
      }
      resolve();
    });
  });
  if (!req.body.entry) {
    return res.status(400).json({ error: "Missing 'entry' in request body" });
  }

  // const { image } = req.body;
  // console.log("image", image);
  if (image) {
    try {
      // Remove data:image/jpeg;base64, or similar prefix if present
      const base64Data = image.split(";base64,").pop();

      // Convert base64 to buffer
      const imageBuffer = Buffer.from(base64Data, "base64");

      // Create a simple file path with timestamp
      const timestamp = Date.now();

      const filePath = `images/image_${uid}_${timestamp}.jpg`;

      // req.body.entry will now be a string that needs to be parsed

      console.log("req.body.entry", JSON.parse(JSON.stringify(req.body.entry)));
      const entry = JSON.parse(req.body.entry);

      // Upload to Supabase with error handling
      const { data: file, error } = await supabase.storage
        .from("user_profiles")
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

      const postImageUrl = `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/user_profiles/${filePath}`;
      console.log("Debug - Generated URL:", postImageUrl);

      // add image to user profile
      const { pid } = req.body;
      const entryData = await Entry.findIdAndUpdate(
        { id: pid },
        { $set: { picture: postImageUrl } },
        { new: true }
      );

      res.status(200).json({ success: true, data: entryData });
    } catch (error) {
      console.error(
        "Error in updating entry:",
        error.message,
        "error data req.body:",
        req.body
      );
      res.status(500).json({ success: false, message: "Server Error" });
    }
  }
};

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
    console.error("Error in deleting entry", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// like product
export const likeEntry = async (req, res) => {
  const { id } = req.params;

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

    entry.likes = (entry.likes || 0) + 1;
    await entry.save();

    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    console.error("Error in liking entry:", error.message);
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
    console.error("Error in commenting entry:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
