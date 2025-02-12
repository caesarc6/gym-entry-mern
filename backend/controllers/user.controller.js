import mongoose from "mongoose";
// import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import User from "../models/user.model.js";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import express from "express";
// import User from "../models/user.model.js";
import Entry from "../models/entry.model.js";
import { verifyIdToken } from "../middleware/auth.js"; // Middleware to verify Firebase ID token
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import { supabase } from "../supabase/supabase.js";

dotenv.config();

const router = express.Router();

// const supabase = createClient(
//   process.env.VITE_SUPABASE_URL,
//   process.env.VITE_SUPABASE_ANON_KEY
// );

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
}).single("profileImage");

// get current mongoDB user
export const getCurrentMongoDBUser = async (req, res) => {
  const { uid } = req.user;

  try {
    // return al data from user
    const user = await User.findOne({ uid });
    // const user = await User.findOne({ uid }).select("uid name email picture");
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve user" });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const { uid } = req.user;

    // Use promisified version of multer middleware
    await new Promise((resolve, reject) => {
      uploadMiddleware(req, res, (err) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });

    // Extract fields from form data
    const { name, goal, gymName, bio, profileImageName, profileImage } =
      req.body;
    console.log("req.body.profileImage", req.body.profileImage);
    console.log("req.body.profileImageName", req.body.profileImageName);
    // Validate that at least one field is provided
    if (!name && !goal && !gymName && !bio && !profileImage) {
      return res.status(400).json({
        success: false,
        message: "No data provided for update",
      });
    }

    // Handle profile picture upload if present
    if (profileImageName !== "undefined") {
      try {
        // Remove data:image/jpeg;base64, or similar prefix if present
        const base64Data = profileImage.split(";base64,").pop();

        // Convert base64 to buffer
        const imageBuffer = Buffer.from(base64Data, "base64");

        // Create a simple file path with timestamp
        const timestamp = Date.now();
        const filePath = `profiles/profile_${uid}/${profileImageName}_${timestamp}.jpg`;

        console.log("Debug - Upload attempt with path:", filePath);

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

        const profileImageUrl = `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/user_profiles/profiles/${filePath}`;
        console.log("Debug - Generated URL:", profileImageUrl);

        await User.findOneAndUpdate(
          { uid: uid.trim() },
          { $set: { picture: profileImageUrl } },
          { new: true }
        );
      } catch (error) {
        console.error("Detailed upload error:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to upload image",
          details: error.message,
        });
      }
    }

    // Build update object with only provided fields
    const updateData = {};
    if (name) updateData.name = name;
    if (goal) updateData.goal = goal;
    if (gymName) updateData.gymName = gymName;
    if (bio) updateData.bio = bio;

    // Update user in database with error handling
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

    // res.status(200).json({
    //   success: true,
    //   message: "Profile updated successfully",
    //   data: user,
    // });
  } catch (error) {
    console.error("Update user profile error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Middleware to handle file upload errors
export const handleFileUpload = (req, res, next) => {
  upload.single("profileImage")(req, res, (err) => {
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

export const checkSupabaseConnection = async () => {
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );

    // Check basic connection
    // console.log("Supabase URL:", process.env.VITE_SUPABASE_URL);
    // console.log(
    //   "Supabase Anon Key:",
    //   process.env.VITE_SUPABASE_ANON_KEY ? "Present" : "Missing"
    // );

    // List buckets with detailed logging
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error(
        "Bucket Listing Error:",
        error
        //    {
        //   code: error.code,
        //   message: error.message,
        //   details: error,
        // }
      );
      return false;
    }

    console.log(
      "Available Buckets:",
      data.map((bucket) => bucket.name)
    );

    // Try to get a specific bucket
    const bucketName = "user_profiles"; // Replace with your actual bucket name
    const { data: bucketData, error: bucketError } =
      await supabase.storage.getBucket(bucketName);

    if (bucketError) {
      console.error(`Error accessing bucket ${bucketName}:`, {
        code: bucketError.code,
        message: bucketError.message,
      });
      return false;
    }

    console.log(`Bucket ${bucketName} details:`, bucketData);

    return true;
  } catch (err) {
    console.error("Comprehensive Supabase Connection Check Failed:", err);
    return false;
  }
};

// Create a new user
export const createUser = async (req, res) => {
  const { uid, name, email, picture } = req.user;

  try {
    let user = await User.findOne({ uid });

    if (!user) {
      user = new User({ uid, name, email, picture });
      await user.save();
    }

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to create user" });
  }
};

// Create a new entry
export const createPost = async (req, res) => {
  const entry = req.body; // user will send this data
  // console.log("req:", req);
  if (!entry.name || !entry.description) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide all fields", entry });
  }
  const { name, description, image } = req.body;
  const { uid } = req.user;

  try {
    // console.log("UID:", uid);
    const post = new Entry({ uid, name, description, image });
    // console.log(post);
    await post.save();
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: "Failed to create entry1" });
  }
};

// Get entries by UID from mongoDB database using pagination
// export const getPostsByUID = async (req, res) => {
//   const { uid } = req.params;

//   // Extract pagination parameters from query string
//   const page = parseInt(req.query.page) || 1; // Default to page 1
//   const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page

//   try {
//     // Calculate the number of documents to skip
//     const skip = (page - 1) * limit;

//     // Fetch posts for the user with pagination
//     const entries = await Entry.find({ uid })
//       .skip(skip) // Skip the previous pages' documents
//       .limit(limit); // Limit the number of documents returned

//     // Get the total number of posts for the user (for calculating total pages)
//     const totalEntries = await Entry.countDocuments({ uid });

//     // Calculate total pages
//     const totalPages = Math.ceil(totalEntries / limit);

//     // Send response with posts and pagination metadata
//     res.status(200).json({
//       success: true,
//       data: entries,
//       pagination: {
//         currentPage: page,
//         totalPages: totalPages,
//         totalEntries: totalEntries,
//         limit: limit,
//       },
//     });
//   } catch (error) {
//     console.error("Error fetching entries:", error);
//     res
//       .status(500)
//       .json({ success: false, error: "Failed to retrieve entries" });
//   }
// };

export const getPostsByUID = async (req, res) => {
  try {
    const { uid } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;

    // Validate page and limit
    if (page < 1 || limit < 1) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid page or limit value" });
    }

    const skip = (page - 1) * limit;

    // Fetch posts for the user with pagination
    const posts = await Entry.find({ uid }).skip(skip).limit(limit);

    // Get the total number of posts for the user
    const totalPosts = await Entry.countDocuments({ uid });

    // Calculate total pages
    const totalPages = Math.ceil(totalPosts / limit);

    res.json({
      success: true,
      data: posts,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalPosts: totalPosts,
        limit: limit,
      },
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ success: false, error: "Failed to retrieve posts" });
  }
};

// Get entries by UID
// export const getPostsByUID = async (req, res) => {
//   const { uid } = req.params;
//   // console.log("UID:", uid);

//   try {
//     const entries = await Entry.find({ uid });
//     res.status(200).json({ success: true, data: entries });
//   } catch (error) {
//     res.status(500).json({ error: "Failed to retrieve entries" });
//   }
//   //
// };

// get users in database sending back all users with name and UID
export const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("name uid");
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve users" });
  }
};

export const getCurrentUser = async (req, res) => {
  const { uid } = req.user;

  try {
    const user = await User.findOne({ uid }).select("uid name email picture");

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve user" });
  }
};

// get user UID and name
export const getUser = async (req, res) => {
  const { uid } = req.params;

  try {
    const user = await User.findOne({ uid }).select("name uid");
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve user" });
  }
};

// get user profile (User info and posts)
export const getUserProfile = async (req, res) => {
  const { uid } = req.params;

  try {
    const user = await User.findOne({ uid }).select(
      "name email picture bio goal gymName"
    );
    const postsLength = await Entry.find({ uid });
    const postsCount = postsLength.length;
    res.status(200).json({ success: true, data: user, postsCount });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve user profile" });
  }
};

export const uploadProfilePic = [
  // First, use the file upload middleware
  handleFileUpload,

  async (req, res) => {
    try {
      const isConnected = await checkSupabaseConnection();
      console.log(process.env.VITE_SUPABASE_URL); // "123"
      console.log(process.env.VITE_SUPABASE_ANON_KEY); // undefined
      if (!isConnected) {
        return res.status(500).json({ error: "Supabase connection failed" });
      }

      const user = req.user; // Assuming user is set in req by authentication middleware
      const fileName = `profile_${user.uid}_${Date.now()}${path.extname(
        req.file.originalname
      )}`;
      const filePath = `profiles/${fileName}`;

      const { data: file, error } = await supabase.storage
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

      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        {
          profilePicture: {
            url: publicUrl,
            storagePath: filePath,
          },
        },
        { new: true }
      );
      console.log("Updated user:", updatedUser);
      res.json({
        url: publicUrl,
        path: filePath,
        user: updatedUser,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: error.message });
    }
  },
];

export default router;
