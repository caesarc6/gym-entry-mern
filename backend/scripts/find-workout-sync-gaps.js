/**
 * Compare Entry posts vs Workout (Progress) rows and list sync gaps.
 *
 * No writes. Safe to run anytime. Needs MONGO_URI / MONGODB_URI in backend/.env.
 *
 * Usage (from repo root):
 *   node backend/scripts/find-workout-sync-gaps.js
 *   node backend/scripts/find-workout-sync-gaps.js --uid=YOUR_UID
 *   node backend/scripts/find-workout-sync-gaps.js --uid=YOUR_UID --since=2026-10-01
 *   node backend/scripts/find-workout-sync-gaps.js --uid=YOUR_UID --days=45
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "../config/db.js";
import Entry from "../models/entry.model.js";
import Workout from "../models/workout.model.js";
import { User } from "../models/user.model.js";
import { parseWorkoutDescription } from "../utils/workoutParser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "backend", ".env"), override: true });
dotenv.config({ path: path.join(__dirname, "../.env"), override: true });

const getArg = (name) => {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
};

const onlyUid = getArg("uid");
const sinceArg = getArg("since");
const daysArg = getArg("days");

const resolveAccountUids = async (authUid) => {
  if (!authUid) return [];
  const ids = new Set([authUid]);
  const user = await User.findOne({
    $or: [{ uid: authUid }, { firebaseUid: authUid }, { supabaseUid: authUid }],
  })
    .select("uid firebaseUid supabaseUid")
    .lean();
  if (user?.uid) ids.add(user.uid);
  if (user?.firebaseUid) ids.add(user.firebaseUid);
  if (user?.supabaseUid) ids.add(user.supabaseUid);
  return [...ids];
};

const looksLikeLiftLine = (line) => {
  const text = String(line || "").trim();
  if (!text) return false;
  if (/\d+(?:\.\d+)?\s*(?:lbs?|kg)\b/i.test(text)) return true;
  if (/\b\d+\s*x\s*\d+\b/i.test(text)) return true;
  if (/\b(?:min|mins|minutes|hr|hrs|hours|incline|lvl|level)\b/i.test(text)) {
    return true;
  }
  return false;
};

const run = async () => {
  await connectDB();

  const uids = onlyUid ? await resolveAccountUids(onlyUid) : null;
  const entryFilter = uids ? { uid: { $in: uids } } : {};

  let since = null;
  if (sinceArg) {
    since = new Date(sinceArg);
    if (Number.isNaN(since.getTime())) {
      throw new Error(`Invalid --since=${sinceArg}`);
    }
  } else if (daysArg) {
    const days = Number(daysArg);
    if (!Number.isFinite(days) || days <= 0) {
      throw new Error(`Invalid --days=${daysArg}`);
    }
    since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  if (since) {
    entryFilter.createdAt = { $gte: since };
  }

  const entries = await Entry.find(entryFilter)
    .select("_id uid name description createdAt")
    .sort({ createdAt: -1 })
    .lean();

  const entryIds = entries.map((e) => e._id);
  const workouts = await Workout.find({ entryId: { $in: entryIds } })
    .select("_id entryId userId workoutDate title totalVolume")
    .lean();
  const workoutByEntry = new Map(
    workouts.map((w) => [String(w.entryId), w]),
  );

  const summary = {
    uidFilter: onlyUid || null,
    resolvedUids: uids,
    since: since ? since.toISOString() : null,
    entries: entries.length,
    workoutsLinked: workouts.length,
    parseableSynced: 0,
    parseableMissingWorkout: 0,
    skippedEmpty: 0,
    skippedEmptyLooksLikeLift: 0,
    workoutUnderWrongUidHint: 0,
    orphanWorkoutCheckSkipped: !uids,
  };

  const missing = [];
  const skippedLiftish = [];
  const skippedOther = [];

  for (const entry of entries) {
    const parsed = parseWorkoutDescription(entry.description || "");
    const workout = workoutByEntry.get(String(entry._id));
    const preview = String(entry.description || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 3);

    if (parsed.length === 0) {
      summary.skippedEmpty += 1;
      const liftish = preview.some(looksLikeLiftLine);
      if (liftish) {
        summary.skippedEmptyLooksLikeLift += 1;
        skippedLiftish.push({
          entryId: String(entry._id),
          uid: entry.uid,
          createdAt: entry.createdAt,
          name: entry.name,
          preview,
        });
      } else if (skippedOther.length < 20) {
        skippedOther.push({
          entryId: String(entry._id),
          uid: entry.uid,
          createdAt: entry.createdAt,
          name: entry.name,
          preview,
        });
      }
      continue;
    }

    if (!workout) {
      summary.parseableMissingWorkout += 1;
      missing.push({
        entryId: String(entry._id),
        uid: entry.uid,
        createdAt: entry.createdAt,
        name: entry.name,
        parsedExercises: parsed.map((e) => e.name),
        preview,
      });
      continue;
    }

    summary.parseableSynced += 1;
    if (uids && workout.userId && !uids.includes(workout.userId)) {
      summary.workoutUnderWrongUidHint += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        summary,
        parseableMissingWorkout: missing,
        skippedEmptyLooksLikeLift: skippedLiftish,
        skippedEmptySample: skippedOther.slice(0, 10),
      },
      null,
      2,
    ),
  );

  await import("mongoose").then((m) => m.default.connection.close());
};

run().catch(async (error) => {
  console.error(error);
  try {
    const mongoose = (await import("mongoose")).default;
    await mongoose.connection.close();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
