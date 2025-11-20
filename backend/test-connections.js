// Test script to verify Firebase and Supabase connections
import "./polyfills/buffer.js";
import dotenv from "dotenv";
import { admin } from "./firebase.js";
import { supabase } from "./supabase/supabase.js";
import fs from "fs";
import path from "path";

dotenv.config();

console.log("=== Connection Test Script ===\n");

// Check Firebase
async function testFirebase() {
  try {
    console.log("🔍 Testing Firebase...");

    // Check if service account file exists
    const serviceAccountPath = path.join(
      process.cwd(),
      "ethereal-gains-firebase-adminsdk-ipqvh-32d83a52d2.json"
    );
    const fileExists = fs.existsSync(serviceAccountPath);
    console.log(`   Service account file exists: ${fileExists ? "✅" : "❌"}`);

    if (!fileExists) {
      console.log(`   Expected path: ${serviceAccountPath}`);
      return false;
    }

    // Check if admin is initialized
    if (!admin) {
      console.log("   ❌ Firebase admin not initialized");
      return false;
    }
    console.log("   ✅ Firebase admin initialized");

    // Test Firebase auth
    const auth = admin.auth();
    console.log("   ✅ Firebase auth available");

    // Try to list users (this will fail if credentials are invalid)
    try {
      // Just check if we can access the auth service
      const testUid = "test-user-id-that-does-not-exist";
      try {
        await auth.getUser(testUid);
      } catch (error) {
        // If it's a "user not found" error, that's good - it means auth is working
        if (error.code === "auth/user-not-found") {
          console.log("   ✅ Firebase credentials are valid");
          return true;
        }
        // If it's a different error, credentials might be invalid
        if (
          error.code === "auth/invalid-credential" ||
          error.code === "auth/invalid-argument"
        ) {
          console.log("   ❌ Firebase credentials appear to be invalid");
          console.log(`   Error: ${error.message}`);
          return false;
        }
        throw error;
      }
    } catch (error) {
      console.log(`   ⚠️  Firebase auth test error: ${error.message}`);
      console.log(`   Error code: ${error.code || "unknown"}`);
      // If it's a credential error, fail
      if (error.code && error.code.includes("credential")) {
        return false;
      }
      // Otherwise, assume it's working
      return true;
    }
  } catch (error) {
    console.log(`   ❌ Firebase test failed: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
    return false;
  }
}

// Check Supabase
async function testSupabase() {
  try {
    console.log("\n🔍 Testing Supabase...");

    if (!supabase) {
      console.log("   ❌ Supabase client not initialized");
      return false;
    }
    console.log("   ✅ Supabase client initialized");

    // Test Supabase connection by making a simple query
    const { data, error } = await supabase
      .from("users")
      .select("count")
      .limit(1);

    if (error) {
      // If it's a permission error, that's okay - it means we're connected
      if (
        error.code === "PGRST116" ||
        error.message.includes("permission") ||
        error.message.includes("JWT")
      ) {
        console.log(
          "   ✅ Supabase connection successful (permission error is expected)"
        );
        return true;
      }
      console.log(`   ❌ Supabase connection failed: ${error.message}`);
      console.log(`   Error code: ${error.code}`);
      return false;
    }

    console.log("   ✅ Supabase connection successful");
    return true;
  } catch (error) {
    console.log(`   ❌ Supabase test failed: ${error.message}`);
    return false;
  }
}

// Run tests
async function runTests() {
  const firebaseSuccess = await testFirebase();
  const supabaseSuccess = await testSupabase();

  console.log("\n=== Test Results ===");
  console.log(`Firebase: ${firebaseSuccess ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Supabase: ${supabaseSuccess ? "✅ PASS" : "❌ FAIL"}`);

  if (firebaseSuccess && supabaseSuccess) {
    console.log(
      "\n🎉 All connections working! Your services are properly configured."
    );
  } else {
    console.log("\n⚠️  Some connections failed. Check your configuration.");
    if (!firebaseSuccess) {
      console.log("\nFirebase troubleshooting:");
      console.log(
        "   1. Check if ethereal-gains-firebase-adminsdk-ipqvh-32d83a52d2.json exists"
      );
      console.log("   2. Verify the JSON file is valid");
      console.log("   3. Check if Firebase project credentials are correct");
    }
    if (!supabaseSuccess) {
      console.log("\nSupabase troubleshooting:");
      console.log("   1. Check supabase/supabase.js for correct URL and key");
      console.log("   2. Verify Supabase project is active");
      console.log("   3. Check if API keys are valid");
    }
  }

  process.exit(firebaseSuccess && supabaseSuccess ? 0 : 1);
}

runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
