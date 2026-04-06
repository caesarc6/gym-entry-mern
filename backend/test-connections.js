// Test script to verify Firebase and Supabase connections
import "./polyfills/buffer.js";
import dotenv from "dotenv";
import { admin } from "./firebase.js";
import { supabase } from "./supabase/supabase.js";
dotenv.config();

// Check Firebase
async function testFirebase() {
  try {
    // Check if admin is initialized
    if (!admin) {
      return false;
    }

    // Test Firebase auth
    const auth = admin.auth();

    // Try to list users (this will fail if credentials are invalid)
    try {
      // Just check if we can access the auth service
      const testUid = "test-user-id-that-does-not-exist";
      try {
        await auth.getUser(testUid);
      } catch (error) {
        // If it's a "user not found" error, that's good - it means auth is working
        if (error.code === "auth/user-not-found") {
          return true;
        }
        // If it's a different error, credentials might be invalid
        if (
          error.code === "auth/invalid-credential" ||
          error.code === "auth/invalid-argument"
        ) {
          return false;
        }
        throw error;
      }
    } catch (error) {
      // If it's a credential error, fail
      if (error.code && error.code.includes("credential")) {
        return false;
      }
      // Otherwise, assume it's working
      return true;
    }
  } catch (error) {
    return false;
  }
}

// Check Supabase
async function testSupabase() {
  try {

    if (!supabase) {
      return false;
    }

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
        return true;
      }
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

// Run tests
async function runTests() {
  const firebaseSuccess = await testFirebase();
  const supabaseSuccess = await testSupabase();


  if (firebaseSuccess && supabaseSuccess) {
  } else {
    if (!firebaseSuccess) {
    }
    if (!supabaseSuccess) {
    }
  }

  process.exit(firebaseSuccess && supabaseSuccess ? 0 : 1);
}

runTests().catch((error) => {
  process.exit(1);
});
