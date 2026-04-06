// Test script to debug deployment issues
import dotenv from "dotenv";
import mongoose from "mongoose";
import { admin } from "./firebase.js";

dotenv.config();

// Test MongoDB connection
async function testMongoDB() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      return false;
    }

    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Test a simple query
    const { User } = await import("./models/user.model.js");
    const userCount = await User.countDocuments();

    return true;
  } catch (error) {
    return false;
  }
}

// Test Firebase connection
async function testFirebase() {
  try {
    if (!admin || !admin.auth) {
      return false;
    }

    // Test Firebase auth
    const auth = admin.auth();

    return true;
  } catch (error) {
    return false;
  }
}

// Run tests
async function runTests() {
  const mongoSuccess = await testMongoDB();
  const firebaseSuccess = await testFirebase();

  if (mongoSuccess && firebaseSuccess) {
  } else {
  }

  process.exit(0);
}

runTests().catch(() => {});
