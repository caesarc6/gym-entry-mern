import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { connectDB } from "../config/db.js";
import { User } from "../models/user.model.js";

const rootEnvPath = path.resolve(process.cwd(), ".env");
const backendEnvPath = path.resolve(process.cwd(), "backend", ".env");
dotenv.config({ path: rootEnvPath });
dotenv.config({ path: backendEnvPath, override: true });

const getArg = (name) => {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
};

const email = getArg("email");
const supabaseUid = getArg("supabase-uid");

if (!email || !supabaseUid) {
  console.error(
    "Usage: node scripts/link-supabase-user.js --email=user@example.com --supabase-uid=UUID"
  );
  process.exit(1);
}

const run = async () => {
  try {
    await connectDB();

    const user = await User.findOne({ email });
    if (!user) {
      console.error(`No user found for email: ${email}`);
      process.exit(1);
    }

    const updateFields = {};
    if (!user.supabaseUid || user.supabaseUid !== supabaseUid) {
      updateFields.supabaseUid = supabaseUid;
    }

    if (Object.keys(updateFields).length === 0) {
      console.log("No changes needed. User already linked.");
      process.exit(0);
    }

    const updated = await User.findByIdAndUpdate(
      user._id,
      { $set: updateFields },
      { new: true }
    );

    console.log("Linked Supabase UID to user:", {
      email: updated.email,
      uid: updated.uid,
      firebaseUid: updated.firebaseUid,
      supabaseUid: updated.supabaseUid,
      authProvider: updated.authProvider,
    });
  } catch (error) {
    console.error("Failed to link Supabase user:", error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

run();
