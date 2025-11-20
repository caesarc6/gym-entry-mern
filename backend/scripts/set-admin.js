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
  console.error("❌ Error: MONGODB_URI not found in environment variables");
  process.exit(1);
}

const identifier = process.argv[2];

if (!identifier) {
  console.error("❌ Error: Please provide a user email or UID");
  console.log("\nUsage: node scripts/set-admin.js <user-email-or-uid>");
  console.log("\nExample:");
  console.log("  node scripts/set-admin.js user@example.com");
  console.log("  node scripts/set-admin.js firebase-uid-here");
  process.exit(1);
}

async function setAdmin() {
  try {
    // Connect to MongoDB
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find user by email or UID
    const user = await User.findOne({
      $or: [{ email: identifier }, { uid: identifier }],
    });

    if (!user) {
      console.error(`❌ User not found: ${identifier}`);
      console.log("\nPlease check:");
      console.log("  - Email address is correct");
      console.log("  - UID is correct");
      console.log("  - User exists in the database");
      process.exit(1);
    }

    // Set as admin
    user.isAdmin = true;
    await user.save();

    console.log("\n✅ Success! User set as admin:");
    console.log(`   Name: ${user.name || "N/A"}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   UID: ${user.uid}`);
    console.log(`   Admin Status: ${user.isAdmin}`);
    console.log(
      "\n🎉 You can now access the admin dashboard at: /admin/dashboard"
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

setAdmin();
