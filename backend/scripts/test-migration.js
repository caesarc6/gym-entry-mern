/**
 * Test script to migrate your current Firebase account to Supabase
 * 
 * This script helps you:
 * 1. Check your current Firebase user data
 * 2. Create/link a Supabase account
 * 3. Verify all data associations are preserved
 * 
 * Usage:
 *   node backend/scripts/test-migration.js
 */

import dotenv from "dotenv";
import { connectDB } from "../config/db.js";
import { User } from "../models/user.model.js";
import Entry from "../models/entry.model.js";
import mongoose from "mongoose";
import { supabaseAdmin } from "../supabase/supabase.js";

dotenv.config();

async function checkCurrentUser(firebaseUid) {
  try {
    await connectDB();
    
    console.log("\n=== Checking Current Firebase User ===");
    const user = await User.findOne({ 
      $or: [
        { uid: firebaseUid },
        { firebaseUid: firebaseUid }
      ]
    });

    if (!user) {
      console.log("❌ User not found in database");
      return null;
    }

    console.log("✅ User found:");
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   UID: ${user.uid}`);
    console.log(`   Firebase UID: ${user.firebaseUid || "Not set"}`);
    console.log(`   Supabase UID: ${user.supabaseUid || "Not migrated"}`);
    console.log(`   Auth Provider: ${user.authProvider || "firebase"}`);

    // Check associated data
    const entries = await Entry.countDocuments({ uid: user.uid });
    const entriesByFirebaseUid = await Entry.countDocuments({ uid: user.firebaseUid || user.uid });
    
    console.log(`\n   Associated Data:`);
    console.log(`   Entries (by uid): ${entries}`);
    console.log(`   Entries (by firebaseUid): ${entriesByFirebaseUid}`);

    return user;
  } catch (error) {
    console.error("Error checking user:", error);
    throw error;
  }
}

async function checkSupabaseUser(email) {
  try {
    if (!supabaseAdmin) {
      console.log("\n⚠️  Supabase admin client not configured");
      return null;
    }

    console.log("\n=== Checking Supabase User ===");
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.log("❌ Error checking Supabase users:", error.message);
      return null;
    }

    const supabaseUser = users.find(u => u.email?.toLowerCase() === email?.toLowerCase());
    
    if (supabaseUser) {
      console.log("✅ Supabase user found:");
      console.log(`   Email: ${supabaseUser.email}`);
      console.log(`   Supabase UID: ${supabaseUser.id}`);
      console.log(`   Created: ${supabaseUser.created_at}`);
      return supabaseUser;
    } else {
      console.log("ℹ️  No Supabase user found with this email");
      console.log("   You'll need to sign up with Supabase first");
      return null;
    }
  } catch (error) {
    console.error("Error checking Supabase user:", error);
    return null;
  }
}

async function simulateMigration(firebaseUid, supabaseUid) {
  try {
    await connectDB();
    
    console.log("\n=== Simulating Migration ===");
    
    const user = await User.findOne({ 
      $or: [
        { uid: firebaseUid },
        { firebaseUid: firebaseUid }
      ]
    });

    if (!user) {
      console.log("❌ User not found");
      return;
    }

    // Check what would change
    console.log("Current state:");
    console.log(`   Primary UID: ${user.uid}`);
    console.log(`   Firebase UID: ${user.firebaseUid || "Not set"}`);
    console.log(`   Supabase UID: ${user.supabaseUid || "Not set"}`);
    console.log(`   Auth Provider: ${user.authProvider || "firebase"}`);

    // Count entries by current UID
    const entriesByCurrentUid = await Entry.countDocuments({ uid: user.uid });
    const entriesByFirebaseUid = await Entry.countDocuments({ uid: user.firebaseUid || user.uid });

    console.log(`\n   Entries linked to current UID: ${entriesByCurrentUid}`);
    console.log(`   Entries linked to Firebase UID: ${entriesByFirebaseUid}`);

    if (supabaseUid) {
      console.log("\nAfter migration would be:");
      console.log(`   Primary UID: ${supabaseUid} (Supabase)`);
      console.log(`   Firebase UID: ${user.firebaseUid || firebaseUid} (preserved)`);
      console.log(`   Supabase UID: ${supabaseUid}`);
      console.log(`   Auth Provider: supabase`);

      // Check if entries would still be accessible
      // Entries are linked by uid field, so we need to update them
      const entriesToUpdate = await Entry.countDocuments({ uid: user.uid });
      console.log(`\n   Entries that would need UID update: ${entriesToUpdate}`);
      console.log(`   ⚠️  Note: Entry UIDs would need to be updated to ${supabaseUid}`);
    }
  } catch (error) {
    console.error("Error simulating migration:", error);
    throw error;
  }
}

async function main() {
  const firebaseUid = process.argv[2];
  const email = process.argv[3];

  if (!firebaseUid) {
    console.log("Usage: node backend/scripts/test-migration.js <firebase-uid> [email]");
    console.log("\nExample:");
    console.log("  node backend/scripts/test-migration.js abc123xyz user@example.com");
    console.log("\nTo get your Firebase UID:");
    console.log("  1. Sign in to your app");
    console.log("  2. Check browser console: auth.currentUser.uid");
    console.log("  3. Or check MongoDB users collection");
    process.exit(1);
  }

  try {
    // Check current Firebase user
    const user = await checkCurrentUser(firebaseUid);
    if (!user) {
      process.exit(1);
    }

    // Check if Supabase user exists
    const supabaseUser = email ? await checkSupabaseUser(email) : null;

    // Simulate migration
    if (supabaseUser) {
      await simulateMigration(firebaseUid, supabaseUser.id);
      
      console.log("\n=== Migration Instructions ===");
      console.log("To complete the migration:");
      console.log("1. Sign in to your app with Supabase (using the same email)");
      console.log("2. Call the migration link endpoint:");
      console.log(`   POST /api/migration/link`);
      console.log(`   Body: { "firebaseUid": "${firebaseUid}" }`);
      console.log("\n3. After migration, your entries will need UID updates");
      console.log("   (This can be done via a migration script)");
    } else {
      console.log("\n=== Next Steps ===");
      console.log("1. Sign up with Supabase using email: " + user.email);
      console.log("2. Run this script again with your Supabase UID");
      console.log("3. Or use the migration link endpoint after signing in");
    }

  } catch (error) {
    console.error("Migration test error:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

main();
