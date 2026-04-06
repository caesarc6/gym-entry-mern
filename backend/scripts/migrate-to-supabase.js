/**
 * Migration script to help migrate Firebase users to Supabase Auth
 * 
 * This script:
 * 1. Lists all Firebase users in MongoDB
 * 2. Shows which users need migration
 * 3. Provides a way to link Firebase and Supabase accounts
 * 
 * Usage:
 *   node scripts/migrate-to-supabase.js [command]
 * 
 * Commands:
 *   list - List all Firebase users
 *   stats - Show migration statistics
 */

import dotenv from "dotenv";
import { connectDB } from "../config/db.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";

dotenv.config();

async function listFirebaseUsers() {
  try {
    await connectDB();
    
    const firebaseUsers = await User.find({
      $or: [
        { authProvider: "firebase" },
        { firebaseUid: { $exists: true } },
        { supabaseUid: { $exists: false } }
      ]
    }).select("uid email name username authProvider firebaseUid supabaseUid createdAt");

    console.log("\n=== Firebase Users ===");
    console.log(`Total Firebase users: ${firebaseUsers.length}\n`);

    firebaseUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || user.email}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   UID: ${user.uid}`);
      console.log(`   Firebase UID: ${user.firebaseUid || "Not set"}`);
      console.log(`   Supabase UID: ${user.supabaseUid || "Not migrated"}`);
      console.log(`   Auth Provider: ${user.authProvider || "firebase"}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log("");
    });

    return firebaseUsers;
  } catch (error) {
    console.error("Error listing Firebase users:", error);
    throw error;
  }
}

async function showMigrationStats() {
  try {
    await connectDB();
    
    const totalUsers = await User.countDocuments();
    const firebaseUsers = await User.countDocuments({
      $or: [
        { authProvider: "firebase" },
        { firebaseUid: { $exists: true } }
      ]
    });
    const supabaseUsers = await User.countDocuments({
      $or: [
        { authProvider: "supabase" },
        { supabaseUid: { $exists: true } }
      ]
    });
    const migratedUsers = await User.countDocuments({
      $and: [
        { firebaseUid: { $exists: true } },
        { supabaseUid: { $exists: true } }
      ]
    });

    console.log("\n=== Migration Statistics ===");
    console.log(`Total users: ${totalUsers}`);
    console.log(`Firebase users: ${firebaseUsers}`);
    console.log(`Supabase users: ${supabaseUsers}`);
    console.log(`Migrated users (both UIDs): ${migratedUsers}`);
    console.log(`Users needing migration: ${firebaseUsers - migratedUsers}`);
    console.log("");

    return {
      totalUsers,
      firebaseUsers,
      supabaseUsers,
      migratedUsers,
      needsMigration: firebaseUsers - migratedUsers
    };
  } catch (error) {
    console.error("Error getting migration stats:", error);
    throw error;
  }
}

async function main() {
  const command = process.argv[2] || "stats";

  try {
    switch (command) {
      case "list":
        await listFirebaseUsers();
        break;
      case "stats":
        await showMigrationStats();
        break;
      default:
        console.log("Unknown command. Use 'list' or 'stats'");
        process.exit(1);
    }
  } catch (error) {
    console.error("Migration script error:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

main();
