import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { connectDB } from "../config/db.js";
import Entry from "../models/entry.model.js";

const rootEnvPath = path.resolve(process.cwd(), ".env");
const backendEnvPath = path.resolve(process.cwd(), "backend", ".env");
dotenv.config({ path: rootEnvPath });
dotenv.config({ path: backendEnvPath, override: true });

const run = async () => {
  try {
    await connectDB();

    const indexNames = await Promise.all([
      Entry.collection.createIndex(
        { uid: 1, createdAt: -1 },
        { name: "uid_createdAt_desc", background: true }
      ),
      Entry.collection.createIndex(
        { createdAt: -1, uid: 1 },
        { name: "createdAt_desc_uid", background: true }
      ),
    ]);
    console.log("Feed indexes ensured:", indexNames);
  } catch (error) {
    console.error("Failed to ensure feed indexes:", error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

run();
