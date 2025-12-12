/**
 * Script to set a user as admin
 *
 * Usage:
 *   node scripts/set-admin.js <user-email-or-uid>
 *
 * Example:
 *   node scripts/set-admin.js user@example.com
 *   node scripts/set-admin.js firebase-uid-here
 */

import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGODB_URI) {
  process.exit(1);
}

const identifier = process.argv[2];

if (!identifier) {
  process.exit(1);
}

async function setAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);

    // Find user by email or UID
    const user = await User.findOne({
      $or: [{ email: identifier }, { uid: identifier }],
    });

    if (!user) {
      process.exit(1);
    }

    // Set as admin
    user.isAdmin = true;
    await user.save();


    process.exit(0);
  } catch (error) {
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

setAdmin();
