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
import User from "../models/user.model.js";

connectDB();

dotenv.config();

// connectAuth();

//
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

verifyIdToken;

const app = express();

app.use(
  cors({
    origin: ["https://gym-track-frontend.vercel.app", "http://localhost:5173"],
  })
);

const __dirname = path.resolve();
app.use(express.json()); // allows to use json data in the body

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
    });
    await user.save();
  }
  res.send(user);
  console.log("API INDEX - User:", user);
});
// Routes

app.use("/api/entrys", entryRoutes);
app.use("/api/", userRoutes);

app.get("/", (req, res) => {
  res.send("Server deployed and running on vercel.");
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
  });
} /* else if (process.env.NODE_ENV === "development") {
//   app.use(express.static(path.join(__dirname, "/frontend/public")));
//   app.get("*", (req, res) => {
//     res.sendFile(path.resolve(__dirname, "frontend", "public", "index.html"));
//   });
 } */

// console.log(process.env.MONGO_URI);
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  // connectDB();
  console.log("Server https://localhost:" + PORT);
});
