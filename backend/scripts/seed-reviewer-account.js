/**
 * Creates the App Store reviewer email/password account with a couple of workouts.
 *
 * Required env:
 *   MONGO_URI
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   REVIEWER_EMAIL
 *   REVIEWER_PASSWORD
 *
 * Optional:
 *   REVIEWER_NAME (default "App Review")
 *   REVIEWER_TRAINER=1 to approve the trainer dashboard
 *
 * Run from the repo root:
 *   node backend/scripts/seed-reviewer-account.js
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { User } from "../models/user.model.js";
import Entry from "../models/entry.model.js";

dotenv.config({ path: new URL("../.env", import.meta.url) });
dotenv.config();

const email = process.env.REVIEWER_EMAIL;
const password = process.env.REVIEWER_PASSWORD;
const name = process.env.REVIEWER_NAME || "App Review";
const approveTrainer = process.env.REVIEWER_TRAINER === "1";

if (!process.env.MONGO_URI || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("MONGO_URI, SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}
if (!email || !password) {
  console.error("REVIEWER_EMAIL and REVIEWER_PASSWORD are required.");
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const workouts = [
  {
    name: "Push",
    description: "Bench Press 135lbs - 8 8 6\nOverhead Press 65lbs - 10 8 8",
  },
  {
    name: "Cardio",
    description: "Treadmill 20 min incline 5 lvl 8",
  },
];

const { data: listed, error: listError } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 200,
});
if (listError) {
  console.error(listError.message);
  process.exit(1);
}

let authUser = (listed?.users || []).find(
  (user) => user.email?.toLowerCase() === email.toLowerCase(),
);

if (!authUser) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, full_name: name },
  });
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  authUser = data.user;
} else {
  const { error } = await supabase.auth.admin.updateUserById(authUser.id, {
    password,
    email_confirm: true,
    user_metadata: { ...(authUser.user_metadata || {}), name, full_name: name },
  });
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
}

await mongoose.connect(process.env.MONGO_URI);

const user = await User.findOneAndUpdate(
  { $or: [{ uid: authUser.id }, { supabaseUid: authUser.id }, { email }] },
  {
    uid: authUser.id,
    supabaseUid: authUser.id,
    authProvider: "supabase",
    email,
    name,
    username: "appreview",
    privacy: { isPrivate: false, showEmail: false, showEntries: true },
    trainerDashboardAccess: approveTrainer ? "approved" : "none",
  },
  { upsert: true, new: true, setDefaultsOnInsert: true },
);

const existing = await Entry.countDocuments({ uid: authUser.id });
if (existing === 0) {
  await Entry.insertMany(
    workouts.map((workout) => ({
      ...workout,
      uid: authUser.id,
    })),
  );
}

console.log(`Reviewer account ready: ${email} (${user.uid})`);
await mongoose.disconnect();
