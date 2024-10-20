import express from "express";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import { connectDB } from "../config/db.js";

import entryRoutes from "../routes/entry.route.js";

connectDB();

dotenv.config();
// Allow all origins
// app.use(cors());
// Allow specific origin(s)

const app = express();

// connectDB();

app.use(
  cors({
    origin: "https://gym-track-frontend.vercel.app",
  })
);

const PORT = process.env.PORT || 5000;

const __dirname = path.resolve();
app.use(express.json()); // allows to use json data in the body

// Routes
app.use("/api/entrys", entryRoutes);

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

app.listen(PORT, () => {
  // connectDB();
  console.log("Server https://localhost:" + PORT);
});
// module.exports = app;
