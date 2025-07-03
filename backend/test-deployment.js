// Test script to debug deployment issues
import dotenv from "dotenv";
import mongoose from "mongoose";
import { admin } from "./firebase.js";

dotenv.config();

console.log("=== Deployment Test Script ===");
console.log("Environment:", process.env.NODE_ENV);
console.log("MongoDB URI set:", !!process.env.MONGO_URI);
console.log("Firebase Project ID set:", !!process.env.FIREBASE_PROJECT_ID);
console.log("Firebase Private Key set:", !!process.env.FIREBASE_PRIVATE_KEY);
console.log("Firebase Client Email set:", !!process.env.FIREBASE_CLIENT_EMAIL);

// Check for Firebase JSON file in development
if (process.env.NODE_ENV !== "production") {
  const fs = await import("fs");
  const path = await import("path");
  const firebaseJsonPath = path.join(
    process.cwd(),
    "ethereal-gains-firebase-adminsdk-ipqvh-32d83a52d2.json"
  );
  console.log("Firebase JSON file exists:", fs.existsSync(firebaseJsonPath));
}

// Test MongoDB connection
async function testMongoDB() {
  try {
    console.log("\n=== Testing MongoDB Connection ===");
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error("❌ MONGO_URI not set");
      return false;
    }

    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB Connected:", conn.connection.host);

    // Test a simple query
    const { User } = await import("./models/user.model.js");
    const userCount = await User.countDocuments();
    console.log("✅ Database query successful. User count:", userCount);

    return true;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    return false;
  }
}

// Test Firebase connection
async function testFirebase() {
  try {
    console.log("\n=== Testing Firebase Connection ===");

    if (!admin || !admin.auth) {
      console.error("❌ Firebase admin not initialized");
      return false;
    }

    console.log("✅ Firebase admin initialized");

    // Test Firebase auth
    const auth = admin.auth();
    console.log("✅ Firebase auth available");

    return true;
  } catch (error) {
    console.error("❌ Firebase connection failed:", error.message);
    console.error("Full error:", error);
    return false;
  }
}

// Run tests
async function runTests() {
  const mongoSuccess = await testMongoDB();
  const firebaseSuccess = await testFirebase();

  console.log("\n=== Test Results ===");
  console.log("MongoDB:", mongoSuccess ? "✅ PASS" : "❌ FAIL");
  console.log("Firebase:", firebaseSuccess ? "✅ PASS" : "❌ FAIL");

  if (mongoSuccess && firebaseSuccess) {
    console.log("\n🎉 All tests passed! Your deployment should work.");
  } else {
    console.log("\n⚠️  Some tests failed. Check your environment variables.");
  }

  process.exit(0);
}

runTests().catch(console.error);
