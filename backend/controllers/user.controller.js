import mongoose from "mongoose";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
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

// const testEnvVariables = () => {
//   console.log("Supabase URL:", process.env.VITE_SUPABASE_URL);
//   console.log(
//     "Supabase Anon Key:",
//     process.env.VITE_SUPABASE_ANON_KEY ? "Present" : "Missing"
//   );
//   console.log("Mongo URI:", process.env.MONGO_URI);
//   console.log("Port:", process.env.PORT);
// };

// // Call the test function
// testEnvVariables();

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

// Get entries by UID
export const getPostsByUID = async (req, res) => {
  const { uid } = req.params;
  // console.log("UID:", uid);

  try {
    const entries = await Entry.find({ uid });
    res.status(200).json({ success: true, data: entries });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve entries" });
  }
  //
};

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

// Multer configuration
// const upload = multer({
//   // In-memory storage
//   storage: multer.memoryStorage(),

//   // File size and type limits
//   limits: {
//     fileSize: 5 * 1024 * 1024, // 5MB limit
//   },
//   fileFilter: (req, file, cb) => {
//     console.log("Received file details:", {
//       originalname: file.originalname,
//       mimetype: file.mimetype,
//     });

//     // Allow only image files
//     const allowedFileTypes = /jpeg|jpg|png|gif|webp/i;
//     const extname = allowedFileTypes.test(
//       path.extname(file.originalname).toLowerCase()
//     );
//     const mimetype = allowedFileTypes.test(file.mimetype);

//     if (extname && mimetype) {
//       return cb(null, true);
//     } else {
//       cb(new Error("Error: Images only!"));
//     }
//   },
// });

// Supabase client
// const supabase = createClient(
//   process.env.VITE_SUPABASE_URL,
//   process.env.VITE_SUPABASE_ANON_KEY
// );

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Middleware to handle file upload errors
const handleFileUpload = (req, res, next) => {
  upload.single("profilePicture")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        error: "File upload error",
        details: err.message,
      });
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

// console.log("Request body:", req.body);
// console.log("Request files:", req.files);
//   if (!req.file) {
//     return res.status(400).json({ error: "No file uploaded" });
//   }
//   upload.single("profilePicture")(req, res, (err) => {
//     if (err instanceof multer.MulterError) {
//       // Multer error (e.g., file too large)
//       return res.status(400).json({
//         error: "File upload error",
//         details: err.message,
//       });
//     } else if (err) {
//       // Other errors (e.g., file type)
//       return res.status(400).json({
//         error: err.message,
//       });
//     }

//     if (!req.file) {
//       return res.status(400).json({ error: "No file uploaded" });
//     }
//     // If no errors, proceed to next middleware
//     next();
//   });
// };

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

// Then the actual upload logic
//   async (req, res) => {
//     // List all buckets to confirm names
//     const isConnected = await checkSupabaseConnection();
//     if (!isConnected) {
//       return res.status(500).json({ error: "Supabase connection failed" });
//     }

//     if (error) {
//       console.error("Full error object:", error);
//       console.error("Error type:", typeof error);
//       console.error("Error stringified:", JSON.stringify(error, null, 2));
//     }

//     // const { data, error } = await supabase.storage.listBuckets().select("*");
//     // console.log("Raw response:", { data, error });
//     // if (error) console.error("Error listing buckets:", error);
//     // else console.log("Available buckets:", data);
//     try {
//       // Validate file upload
//       if (!req.file) {
//         return res.status(400).json({
//           error: "No file uploaded",
//           details: {
//             file: req.file,
//             body: req.body,
//           },
//         });
//       }

//       // Ensure user is authenticated
//       if (!req.user) {
//         return res.status(401).json({ error: "Unauthorized" });
//       }

//       // Find user in MongoDB
//       const user = await User.findOne({ uid: req.user.uid });
//       if (!user) {
//         return res.status(404).json({ error: "User not found" });
//       }

//       // Generate a unique filename
//       const fileName = `profile_${user.uid}_${Date.now()}${path.extname(
//         req.file.originalname
//       )}`;
//       const filePath = `profiles/${fileName}`;

//       // Upload to Supabase storage
//       const { data, error } = await supabase.storage
//         .from("post_images")
//         .upload(filePath, req.file.buffer, {
//           cacheControl: "3600",
//           upsert: true,
//         });

//       if (error) {
//         console.error("Supabase upload error:", error);
//         return res.status(500).json({ error: "Failed to upload image" });
//       }

//       // Get public URL
//       const {
//         data: { publicUrl },
//       } = supabase.storage.from("user_profiles").getPublicUrl(filePath);

//       // Update user document with new profile image URL
//       const updatedUser = await User.findByIdAndUpdate(
//         user._id,
//         {
//           profilePicture: {
//             url: publicUrl,
//             storagePath: filePath,
//           },
//         },
//         { new: true }
//       );

//       res.json({
//         url: publicUrl,
//         path: filePath,
//         user: updatedUser,
//       });
//     } catch (error) {
//       console.error("Upload error:", error);
//       res.status(500).json({ error: error.message });
//     }
//   },
// ];

// post profile picture
// export const uploadProfilePic = async (req, res) => {
//   try {
//     // Validate file upload
//     if (!req.file) {
//       return res.status(400).json({ error: "No file uploaded" });
//     }

//     // Ensure user is authenticated
//     if (!req.user) {
//       return res.status(401).json({ error: "Unauthorized" });
//     }

//     // Find user in MongoDB
//     const user = await User.findOne({ uid: req.user.uid });
//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     // Generate a unique filename
//     const fileName = `profile_${user.uid}_${Date.now()}${path.extname(
//       req.file.originalname
//     )}`;
//     const filePath = `profiles/${fileName}`;

//     // Upload to Supabase storage
//     const { data, error } = await supabase.storage
//       .from("user-profiles") // Replace with your actual bucket name
//       .upload(filePath, req.file.buffer, {
//         cacheControl: "3600",
//         upsert: true,
//       });

//     if (error) {
//       console.error("Supabase upload error:", error);
//       return res.status(500).json({ error: "Failed to upload image" });
//     }

//     // Get public URL
//     const {
//       data: { publicUrl },
//     } = supabase.storage.from("user-profiles").getPublicUrl(filePath);

//     // Update user document with new profile image URL
//     const updatedUser = await User.findByIdAndUpdate(
//       user._id,
//       {
//         profilePicture: {
//           url: publicUrl,
//           storagePath: filePath,
//         },
//       },
//       { new: true } // Return the updated document
//     );

//     res.json({
//       url: publicUrl,
//       path: filePath,
//       user: updatedUser,
//     });
//   } catch (error) {
//     console.error("Upload error:", error);
//     res.status(500).json({ error: error.message });
//   }
// };

//   try {
//     // Ensure Firebase admin is initialized elsewhere in your app
//     const storage = getStorage();

//     if (!req.file) {
//       return res.status(400).json({ error: "No file uploaded" });
//     }

//     // Validate user authentication
//     if (!req.user) {
//       return res.status(401).json({ error: "Unauthorized" });
//     }

//     // Find user in MongoDB
//     const user = await User.findOne({ uid: req.user.uid });
//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     // Create a storage reference
//     const storageRef = ref(
//       storage,
//       `profilePictures/${user.uid}/${Date.now()}_${req.file.originalname}`
//     );

//     // Upload file to Firebase Storage
//     const snapshot = await uploadBytes(storageRef, req.file.buffer);

//     // Get download URL
//     const downloadURL = await getDownloadURL(snapshot.ref);

//     // Update user document
//     await User.findByIdAndUpdate(user._id, {
//       profilePicture: {
//         url: downloadURL,
//         storagePath: snapshot.ref.fullPath,
//       },
//     });

//     res.json({ url: downloadURL, path: snapshot.ref.fullPath });
//   } catch (error) {
//     console.error("Upload error:", error);
//     res.status(500).json({ error: error.message });
//   }
// };

// try {
//   // const firebaseUser = await verifyIdToken(req.headers.authorization);
//   const firebaseUser = req.user;
//   //find mongoDB user
//   const user = await User.findOne({ uid: firebaseUser.uid });

//   // use Supabase storage service to upload image
//   const { path, url } = await storageService.uploadProfilePic(
//     req.file, // Mutler or similar middleware handles file
//     user._id, // MongoDB User ID
//     firebaseUser.uid //  Firebase UID
//   );

//   // Update user document with new profile image URL
//   await User.findByIdAndUpdate(user._id, {
//     profilePicture: {
//       url: url,
//       storagePath: path,
//     },
//   });

//   res.json({ url, path });
// } catch (error) {
//   res.status(500).json({ error: error.message });
// }
// };

export default router;
