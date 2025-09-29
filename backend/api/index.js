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

connectDB();

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

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

const __dirname = path.resolve();
// write a middleware to check if the user is authenticated and create a user in the database if it doesn't exist
app.post("/api/protected", verifyIdToken, async (req, res) => {
  const { uid, name, email, picture } = req.user;
  // const { username } = req.body; // Get the username from the request body

  // if (!username) {
  //   return res.status(400).json({ error: "Username is required" });
  // }
  let user = await User.findOne({ uid });

  if (!user) {
    // Generate username from name: remove spaces and convert to lowercase
    const generatedUsername = name
      ? name.replace(/\s+/g, "").toLowerCase()
      : `user${Date.now()}`;

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
  }
  res.send(user);
});
// Routes

app.use("/api/entrys", entryRoutes);
app.use("/api/", userRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/api/shared-workouts", sharedWorkoutRoutes);

app.get("/api", (req, res) => {
  res.send("Server deployed and running on vercel.");
});

// Temporary test endpoints
app.get("/api/entrys/test", (req, res) => {
  res.json({ message: "Entries endpoint is working!" });
});

app.get("/api/getCurrentUser", (req, res) => {
  res.json({ message: "User endpoint is working!" });
});

app.get("/api/posts/:uid", (req, res) => {
  res.json({ message: "Posts endpoint is working!", uid: req.params.uid });
});

// Test route to check if the server is working
app.get("/api/test", (req, res) => {
  res.json({ success: true, message: "API is working" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);

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
  app.listen(PORT, () => {
    // connectDB();
  });
}

// Export for Vercel
export default app;
