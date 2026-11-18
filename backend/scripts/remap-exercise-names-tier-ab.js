/**
 * Remap Workout.exercises.name for Tier A/B merges (Caesar audit).
 *
 * Exact-string renames only. Updates nameKey. Idempotent.
 *
 *   node backend/scripts/remap-exercise-names-tier-ab.js --uid=UID --dry-run
 *   node backend/scripts/remap-exercise-names-tier-ab.js --uid=UID
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "../config/db.js";
import Workout from "../models/workout.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({
  path: path.resolve(process.cwd(), "backend", ".env"),
  override: true,
});
dotenv.config({ path: path.join(__dirname, "../.env"), override: true });

const getArg = (name) => {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
};

const dryRun = process.argv.includes("--dry-run");
const authUid = getArg("uid");
if (!authUid) {
  console.error("Required: --uid=...");
  process.exit(1);
}

/** Exact stored name → canonical (Tier A + approved Tier B leans). */
export const TIER_AB_RENAMES = {
  // A1 cardio
  "Treadmill ,": "Treadmill",
  "Treadmill , ,": "Treadmill",
  "Treadmill Incline , Speed 2.7 ,": "Treadmill",
  "Stair Master ,": "Stair Master",
  "Stairmaster ,": "Stair Master",
  "Stair Master , 25:": "Stair Master",
  "Stair Master 2,": "Stair Master",
  // A2 typos
  "Chess Press": "Machine Chest Press",
  "Played Lunge": "Plated Lunge",
  "Played Squat": "Plated Squat",
  "Seater Row": "Seated Row",
  "Converting Chest Press": "Converging Chest Press",
  "Reverse Per Fly": "Rear Delt Fly",
  "Smith Mach Press": "Smith Chest Press",
  // A3 word-order / synonym
  "Overhead Cable Extension": "Cable Overhead Extension",
  "Overhead Cable Tricep Extension": "Cable Overhead Extension",
  "Overhead Tricep Cable Extension": "Cable Overhead Extension",
  "Overhead Dumbbell Extension": "Dumbbell Overhead Extension",
  "Overhead Dumbbell Tricep Extension": "Dumbbell Overhead Extension",
  "Dumbbell Overhead Tricep": "Dumbbell Overhead Extension",
  "Tricep Cable Extension": "Cable Tricep Extension",
  "Bar Cable Curl": "Cable Bar Curl",
  "Jm Bench Press": "Jm Press",
  "Reverse Barbell": "Reverse Barbell Curl",
  "Reverse Bar Curl": "Reverse Barbell Curl",
  "Dumbbell Row": "Dumbbell Bent-Over Row",
  "Barbell Bent Row": "Barbell Bent-Over Row",
  "Barbell Bentover Row": "Barbell Bent-Over Row",
  "Barbell Row": "Barbell Bent-Over Row",
  // A4 S-bar / close-grip
  "Cable Sbar Curl": "Cable S-Bar Curl",
  "Cable Sbar Cg Curl": "Cable Close-Grip S-Bar Curl",
  "Cable Cgb Curl": "Cable Close-Grip Bar Curl",
  "Cable Close Bar Curl": "Cable Close-Grip Bar Curl",
  "Cable Inner Bar Curl": "Cable Close-Grip Bar Curl",
  "S Bar Curl": "S-Bar Curl",
  "Sbb Curl": "S-Bar Curl",
  "Sbb Cg Curl": "Close-Grip S-Bar Curl",
  // A5 ISO lat
  "Iso Lat Chest Press": "ISO Lateral Chest Press",
  "Iso Lat Chest": "ISO Lateral Chest Press",
  "Chest Iso Lateral": "ISO Lateral Chest Press",
  "Iso Lat Press": "ISO Lateral Chest Press",
  "Iso Lat Wide Chest": "ISO Lateral Wide Chest Press",
  // B leans
  "Cable Side Raise": "Cable Lateral Raise",
  "Close Grip Pulldown": "Close-Grip Lat Pulldown",
  "Cable Close Grip Pulldown": "Close-Grip Lat Pulldown",
  "Cable Cg Pulldown": "Close-Grip Lat Pulldown",
  "Cable Extension": "Cable Tricep Extension",
  "Cable Bar Extension": "Cable Tricep Extension",
  "Cable Cable Extension": "Cable Tricep Extension",
  "Decline Press": "ISO Lateral Decline Press",
  "Barbell Bench": "Bench Press",
  "Dumbbell Incline": "Incline Dumbbell Press",
  "Dumbbell Press S Press": "Dumbbell Press",
  "Barbell Barbell Overhead Extension Incline": "Barbell Overhead Extension",
};

const resolveAccountUids = async (id) => {
  const ids = new Set([id]);
  const user = await User.findOne({
    $or: [{ uid: id }, { firebaseUid: id }, { supabaseUid: id }],
  })
    .select("uid firebaseUid supabaseUid")
    .lean();
  if (user?.uid) ids.add(user.uid);
  if (user?.firebaseUid) ids.add(user.firebaseUid);
  if (user?.supabaseUid) ids.add(user.supabaseUid);
  return [...ids];
};

const run = async () => {
  await connectDB();
  const uids = await resolveAccountUids(authUid);
  const fromNames = Object.keys(TIER_AB_RENAMES);
  const workouts = await Workout.find({
    userId: uids.length === 1 ? uids[0] : { $in: uids },
    "exercises.name": { $in: fromNames },
  }).select("exercises.name exercises.nameKey title workoutDate");

  let exerciseRenames = 0;
  const tally = new Map();

  for (const workout of workouts) {
    let dirty = false;
    for (const ex of workout.exercises || []) {
      const next = TIER_AB_RENAMES[ex.name];
      if (!next || next === ex.name) continue;
      const key = `${ex.name} => ${next}`;
      tally.set(key, (tally.get(key) || 0) + 1);
      ex.name = next;
      ex.nameKey = next.trim().toLowerCase();
      exerciseRenames += 1;
      dirty = true;
    }
    if (dirty && !dryRun) {
      workout.updatedAt = new Date();
      await workout.save();
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        uids,
        workoutsTouched: workouts.length,
        exerciseRenames,
        tally: Object.fromEntries([...tally.entries()].sort()),
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
