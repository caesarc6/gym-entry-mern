// Buffer polyfill for Node.js compatibility
// Import polyfill early to ensure Buffer is available globally
import "../polyfills/buffer.js";

import express from "express";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import { connectAuth } from "../config/auth.js";
import { connectDB, ensureMongoConnected } from "../config/db.js";
import { admin } from "../firebase.js";
import { verifyIdToken } from "../middleware/auth.js";
import entryRoutes from "../routes/entry.route.js";
import userRoutes from "../routes/user.route.js";
import workoutRoutes from "../routes/workout.route.js";
import sharedWorkoutRoutes from "../routes/sharedWorkout.route.js";

import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { migrateUserData } from "../controllers/migration.controller.js";
import Entry from "../models/entry.model.js";
import bodyParser from "body-parser";
// const bodyParser = require("body-parser");

// Load environment variables first
dotenv.config();

// Connect to database (don't await - let it connect in background)
// But we'll check connection state in routes
connectDB().catch((error) => {
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


app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }

      
      // Check if origin is in allowed list
      if (allAllowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
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
  next();
});

const __dirname = path.resolve();
// write a middleware to check if the user is authenticated and create a user in the database if it doesn't exist
app.post("/api/protected", verifyIdToken, async (req, res) => {
  try {
    // Check if req.user exists (should be set by verifyIdToken middleware)
    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: User information not found",
      });
    }

    const { uid, name, email, picture } = req.user;
    if (!uid) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Token did not include a user id",
      });
    }

    const dbReady = await ensureMongoConnected();
    if (!dbReady.ok) {
      return res.status(500).json({
        success: false,
        message: dbReady.message || "Database connection error",
      });
    }

    // Determine auth provider from req.user (set by middleware)
    const authProvider = req.user.authProvider || "firebase";
    const firebaseUid =
      req.user.firebaseUid || (authProvider === "firebase" ? uid : null);
    const supabaseUid =
      req.user.supabaseUid || (authProvider === "supabase" ? uid : null);

    let user;
    let created = false;
    try {
      const lookupConditions = [{ uid }];

      if (firebaseUid) {
        lookupConditions.push({ firebaseUid });
      }

      if (supabaseUid) {
        lookupConditions.push({ supabaseUid });
      }

      if (email) {
        lookupConditions.push({ email });
      }

      // Try to find user by any matching UID (uid, firebaseUid, or supabaseUid)
      user = await User.findOne({
        $or: lookupConditions,
      });
    } catch (dbError) {
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

      const safeEmail =
        email && String(email).trim()
          ? String(email).trim().toLowerCase()
          : `${uid}@oauth.noreply.local`;

      try {
        // Create new user with appropriate UID fields based on auth provider
        const userData = {
          uid, // Primary UID
          name: name || "User",
          email: safeEmail,
          picture,
          username: generatedUsername,
          authProvider,
          bio: null,
          goal: null,
          gymName: null,
          backgroundPicture: null,
        };

        // Set provider-specific UID fields
        if (authProvider === "firebase") {
          userData.firebaseUid = uid;
        } else if (authProvider === "supabase") {
          userData.supabaseUid = uid;
        }

        user = new User(userData);
        await user.save();
        created = true;
      } catch (saveError) {
        // Check if it's a duplicate key error (user already exists)
        if (saveError.code === 11000) {
          // User was created between findOne and save, try to fetch again
          const retryConditions = [{ uid }];
          if (firebaseUid) {
            retryConditions.push({ firebaseUid });
          }
          if (supabaseUid) {
            retryConditions.push({ supabaseUid });
          }

          user = await User.findOne({
            $or: retryConditions,
          });
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
    } else {
      // Returning user on Supabase: if Mongo still uses the legacy Firebase UID as
      // primary `uid`, promote the Supabase UID and rewrite related documents.
      if (
        authProvider === "supabase" &&
        email &&
        user.email?.toLowerCase() === email.toLowerCase()
      ) {
        if (user.supabaseUid && user.supabaseUid !== uid) {
          return res.status(409).json({
            success: false,
            message:
              "This email is associated with a different Supabase account in our records.",
          });
        }
        if (user.uid !== uid) {
          const oldUid = user.uid;
          const firebaseUidToPreserve = user.firebaseUid || oldUid;
          try {
            user = await User.findOneAndUpdate(
              { _id: user._id },
              {
                $set: {
                  uid,
                  supabaseUid: uid,
                  firebaseUid: firebaseUidToPreserve,
                  authProvider: "supabase",
                },
              },
              { new: true }
            );
            if (oldUid !== uid) {
              await migrateUserData(oldUid, uid);
            }
          } catch (migrationError) {
            console.error("Supabase UID migration error:", migrationError);
            return res.status(500).json({
              success: false,
              message: "Failed to migrate account to new authentication uid",
              error:
                process.env.NODE_ENV === "development"
                  ? migrationError.message
                  : undefined,
            });
          }
        }
      }

      // User exists - update UID fields if needed (backfill provider-specific ids)
      const updateFields = {};

      const isSameProvider = !user.authProvider || user.authProvider === authProvider;

      if (authProvider === "firebase" && !user.firebaseUid) {
        updateFields.firebaseUid = uid;
      } else if (authProvider === "supabase" && !user.supabaseUid) {
        updateFields.supabaseUid = uid;
      }

      if (authProvider === "supabase" && !user.supabaseUid && email) {
        updateFields.supabaseUid = uid;
      }

      if (isSameProvider) {
        updateFields.authProvider = authProvider;
        if (user.uid !== uid) {
          updateFields.uid = uid;
        }
      }

      if (Object.keys(updateFields).length > 0) {
        try {
          user = await User.findOneAndUpdate(
            { _id: user._id },
            { $set: updateFields },
            { new: true }
          );
        } catch (updateError) {
          console.error("Error updating user UID fields:", updateError);
        }
      }
    }

    const userJson =
      user && typeof user.toJSON === "function" ? user.toJSON() : user;

    res.status(200).json({
      success: true,
      created,
      data: userJson,
    });
  } catch (error) {
    console.error("[api/protected] error:", error?.message || error);
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

  // Handle CORS errors specifically
  if (err.message && err.message.includes("Not allowed by CORS")) {
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
    return res.status(413).json({
      success: false,
      message: "File too large. Please upload a smaller image.",
      error: "Payload too large",
    });
  }

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
  const server = app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `Port ${PORT} is already in use. Stop the other server or run: lsof -nP -iTCP:${PORT} -sTCP:LISTEN`
      );
    } else {
      console.error(err);
    }
    process.exit(1);
  });
}

// Export for Vercel
export default app;
