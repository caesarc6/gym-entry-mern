/**
 * Migration script to update all user data (entries, etc.) to use new Supabase UID
 * 
 * This script updates all data associations when migrating from Firebase to Supabase
 * 
 * Usage:
 *   node backend/scripts/migrate-user-data.js <firebase-uid> <supabase-uid>
 */

import dotenv from "dotenv";
import { connectDB } from "../config/db.js";
import { User } from "../models/user.model.js";
import Entry from "../models/entry.model.js";
import mongoose from "mongoose";

dotenv.config();

async function migrateUserData(firebaseUid, supabaseUid) {
  try {
    await connectDB();
    
    console.log("\n=== Migrating User Data ===");
    console.log(`Firebase UID: ${firebaseUid}`);
    console.log(`Supabase UID: ${supabaseUid}`);

    // Verify user exists
    const user = await User.findOne({
      $or: [
        { uid: firebaseUid },
        { firebaseUid: firebaseUid },
        { uid: supabaseUid },
        { supabaseUid: supabaseUid }
      ]
    });

    if (!user) {
      console.log("❌ User not found");
      return;
    }

    console.log(`✅ Found user: ${user.email}`);

    // Update entries
    const entriesResult = await Entry.updateMany(
      { uid: firebaseUid },
      { $set: { uid: supabaseUid } }
    );
    console.log(`✅ Updated ${entriesResult.modifiedCount} entries`);

    // Update user model
    const userUpdate = await User.findOneAndUpdate(
      { _id: user._id },
      {
        $set: {
          uid: supabaseUid,
          supabaseUid: supabaseUid,
          authProvider: "supabase"
        }
      },
      { new: true }
    );
    console.log(`✅ Updated user model`);

    // Verify migration
    const entriesCount = await Entry.countDocuments({ uid: supabaseUid });
    console.log(`\n✅ Verification:`);
    console.log(`   Entries now linked to Supabase UID: ${entriesCount}`);
    console.log(`   User primary UID: ${userUpdate.uid}`);
    console.log(`   User auth provider: ${userUpdate.authProvider}`);

    console.log("\n✅ Migration complete!");
    
  } catch (error) {
    console.error("❌ Migration error:", error);
    throw error;
  }
}

async function main() {
  const firebaseUid = process.argv[2];
  const supabaseUid = process.argv[3];

  if (!firebaseUid || !supabaseUid) {
    console.log("Usage: node backend/scripts/migrate-user-data.js <firebase-uid> <supabase-uid>");
    console.log("\nExample:");
    console.log("  node backend/scripts/migrate-user-data.js abc123xyz def456uvw");
    process.exit(1);
  }

  try {
    await migrateUserData(firebaseUid, supabaseUid);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

main();
