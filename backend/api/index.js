// Buffer polyfill for Node.js compatibility
// Import polyfill early to ensure Buffer is available globally
import "../polyfills/buffer.js";

import express from "express";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import { connectAuth } from "../config/auth.js";
import { connectDB } from "../config/db.js";
import { admin } from "../firebase.js";
import { verifyIdToken } from "../middleware/auth.js";
import entryRoutes from "../routes/entry.route.js";
import userRoutes from "../routes/user.route.js";
import workoutRoutes from "../routes/workout.route.js";
import sharedWorkoutRoutes from "../routes/sharedWorkout.route.js";

import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import bodyParser from "body-parser";
// const bodyParser = require("body-parser");

// Load environment variables first
dotenv.config();

// Connect to database (don't await - let it connect in background)
// But we'll check connection state in routes
connectDB().catch((error) => {
  console.error("❌ [DB] Failed to connect to database:", error);
  // Don't exit in serverless - let it retry on next request
});

connectAuth();

verifyIdToken;

const app = express();

// Configure body parser with higher limits for image uploads
app.use(express.json({ limit: "50mb" })); // allows to use json data in the body with 50MB limit
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
app.use(bodyParser.json({ limit: "50mb" }));
// app.use(express.urlencoded({ extended: true }));

// Configure CORS with environment variables
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:5173"];

// Add production domains that should always be allowed
const productionDomains = [
  "https://www.etherealgains.com",
  "https://etherealgains.com",
  "https://etherealgains.vercel.app",
];

// Combine allowed origins with production domains
const allAllowedOrigins = [...new Set([...allowedOrigins, ...productionDomains])];

console.log("🌐 [CORS] Allowed origins:", allAllowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        console.log("🌐 [CORS] Request with no origin - allowing");
        return callback(null, true);
      }

      console.log("🌐 [CORS] Checking origin:", origin);
      
      // Check if origin is in allowed list
      if (allAllowedOrigins.indexOf(origin) !== -1) {
        console.log("✅ [CORS] Origin allowed:", origin);
        callback(null, true);
      } else {
        console.error("❌ [CORS] Origin not allowed:", origin);
        console.error("❌ [CORS] Allowed origins:", allAllowedOrigins);
        callback(new Error(`Not allowed by CORS. Origin: ${origin}`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Add request logging middleware BEFORE routes
app.use((req, res, next) => {
  console.log("🔍 [SERVER] Incoming request:", {
    method: req.method,
    url: req.url,
    hasBody: !!req.body,
    bodyKeys: req.body ? Object.keys(req.body) : [],
    bodySize: req.body ? JSON.stringify(req.body).length : 0,
    hasAuth: !!req.headers.authorization,
    contentType: req.headers["content-type"],
  });
  next();
});

const __dirname = path.resolve();
// write a middleware to check if the user is authenticated and create a user in the database if it doesn't exist
app.post("/api/protected", verifyIdToken, async (req, res) => {
  try {
    // Check if req.user exists (should be set by verifyIdToken middleware)
    if (!req.user) {
      console.error("❌ [PROTECTED] req.user is undefined");
      return res.status(403).json({
        success: false,
        message: "Unauthorized: User information not found",
      });
    }

    const { uid, name, email, picture } = req.user;

    // Check database connection and wait if connecting
    const dbState = mongoose.connection.readyState;
    if (dbState === 0) {
      // Disconnected - try to reconnect
      console.error("❌ [PROTECTED] Database disconnected. Attempting reconnect...");
      try {
        await connectDB();
      } catch (reconnectError) {
        console.error("❌ [PROTECTED] Reconnect failed:", reconnectError);
        return res.status(500).json({
          success: false,
          message: "Database connection error",
        });
      }
    } else if (dbState === 2) {
      // Connecting - wait a bit for connection to establish
      console.log("⏳ [PROTECTED] Database connecting, waiting...");
      let waitTime = 0;
      const maxWait = 5000; // 5 seconds max wait
      while (mongoose.connection.readyState === 2 && waitTime < maxWait) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        waitTime += 100;
      }
      if (mongoose.connection.readyState !== 1) {
        console.error("❌ [PROTECTED] Database still not connected after wait");
        return res.status(500).json({
          success: false,
          message: "Database connection timeout",
        });
      }
    } else if (dbState !== 1) {
      console.error("❌ [PROTECTED] Database not ready. State:", dbState);
      return res.status(500).json({
        success: false,
        message: "Database connection error",
      });
    }

    let user;
    try {
      user = await User.findOne({ uid });
    } catch (dbError) {
      console.error("❌ [PROTECTED] Database query error:", dbError);
      return res.status(500).json({
        success: false,
        message: "Database query error",
        error: process.env.NODE_ENV === "development" ? dbError.message : undefined,
      });
    }

    if (!user) {
      // Generate username from name: remove spaces and convert to lowercase
      const generatedUsername = name
        ? name.replace(/\s+/g, "").toLowerCase()
        : `user${Date.now()}`;

      try {
        user = new User({
          uid,
          name,
          email,
          picture,
          username: generatedUsername,
          profileImage: null, // Additional field initialized with null
          bio: null, // Additional field initialized with null
          goal: null, // Additional field initialized with null
          gymName: null, // Additional field initialized with null
          backgroundPicture: null, // Additional field initialized with null
        });
        await user.save();
      } catch (saveError) {
        console.error("❌ [PROTECTED] User save error:", saveError);
        // Check if it's a duplicate key error (user already exists)
        if (saveError.code === 11000) {
          // User was created between findOne and save, try to fetch again
          user = await User.findOne({ uid });
          if (!user) {
            return res.status(500).json({
              success: false,
              message: "Failed to create user",
              error: process.env.NODE_ENV === "development" ? saveError.message : undefined,
            });
          }
        } else {
          return res.status(500).json({
            success: false,
            message: "Failed to create user",
            error: process.env.NODE_ENV === "development" ? saveError.message : undefined,
          });
        }
      }
    }
    
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("❌ [PROTECTED] Error:", error);
    console.error("❌ [PROTECTED] Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});
// Routes

app.use("/api/entrys", entryRoutes);
app.use("/api/", userRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/api/shared-workouts", sharedWorkoutRoutes);

app.get("/api", (req, res) => {
  res.send("Server deployed and running on vercel.");
});

// Temporary test endpoints (removed to avoid conflicts with actual routes)
// app.get("/api/entrys/test", (req, res) => {
//   res.json({ message: "Entries endpoint is working!" });
// });

// app.get("/api/getCurrentUser", (req, res) => {
//   res.json({ message: "User endpoint is working!" });
// });

// app.get("/api/posts/:uid", (req, res) => {
//   res.json({ message: "Posts endpoint is working!", uid: req.params.uid });
// });

// Test route to check if the server is working
app.get("/api/test", (req, res) => {
  res.json({ success: true, message: "API is working" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ [SERVER] Global error handler triggered");
  console.error("❌ [SERVER] Error details:", {
    message: err.message,
    type: err.type,
    stack: err.stack,
    url: req.url,
    method: req.method,
    origin: req.headers.origin,
    body: req.body ? Object.keys(req.body) : "No body",
  });

  // Handle CORS errors specifically
  if (err.message && err.message.includes("Not allowed by CORS")) {
    console.error("❌ [SERVER] CORS error detected");
    return res.status(403).json({
      success: false,
      message: "CORS Error: Origin not allowed",
      error: process.env.NODE_ENV === "development" 
        ? `Origin ${req.headers.origin} is not in ALLOWED_ORIGINS` 
        : "Origin not allowed",
    });
  }

  // Handle payload too large errors specifically
  if (err.type === "entity.too.large") {
    console.error("❌ [SERVER] Payload too large error detected");
    return res.status(413).json({
      success: false,
      message: "File too large. Please upload a smaller image.",
      error: "Payload too large",
    });
  }

  console.error("❌ [SERVER] Sending 500 error response");
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    method: req.method,
    url: req.url,
  });
});

// For Vercel deployment, we don't serve static files here
// Vercel handles the frontend routing separately

const PORT = process.env.PORT || 5001;

// Only start the server if we're not in Vercel
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    // connectDB();
  });
}

// Export for Vercel
export default app;
