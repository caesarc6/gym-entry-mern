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

import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import bodyParser from "body-parser";
// const bodyParser = require("body-parser");

// Load environment variables first
dotenv.config();

connectDB();

// connectAuth();

//
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

verifyIdToken;

const app = express();
app.use(express.json()); // allows to use json data in the body
app.use(bodyParser.urlencoded({ extended: true }));
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
    user = new User({
      uid,
      name,
      email,
      picture,
      profileImage: null, // Additional field initialized with null
      bio: null, // Additional field initialized with null
      goal: null, // Additional field initialized with null
      gymName: null, // Additional field initialized with null
      backgroundPicture: null, // Additional field initialized with null
    });
    await user.save();
  }
  res.send(user);
  console.log("API INDEX - User:", user);
});
// Routes

app.use("/api/entrys", entryRoutes);
app.use("/api/", userRoutes);

app.get("/api", (req, res) => {
  res.send("Server deployed and running on vercel.");
});

// For Vercel deployment, we don't serve static files here
// Vercel handles the frontend routing separately

const PORT = process.env.PORT || 5001;

// Only start the server if we're not in Vercel
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    // connectDB();
    console.log(
      `Server running on port ${PORT} in ${
        process.env.NODE_ENV || "development"
      } mode`
    );
    console.log(`Allowed origins: ${allowedOrigins.join(", ")}`);
  });
}

// Export for Vercel
export default app;
