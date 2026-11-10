/**
 * Re-parse Entry descriptions into Workout rows (Progress).
 *
 * Safe to re-run: syncWorkoutFromEntry replaces exercises for each entry that
 * still parses as a workout, and deletes the Workout row when nothing parses.
 *
 * Manual only — not wired to the UI. Auto-process on create/edit stays as-is.
 *
 * Usage (from repo root or backend/):
 *   node backend/scripts/resync-workouts-from-entries.js --dry-run
 *   node backend/scripts/resync-workouts-from-entries.js
 *   node backend/scripts/resync-workouts-from-entries.js --uid=USER_UID
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "../config/db.js";
import Entry from "../models/entry.model.js";
import Workout from "../models/workout.model.js";
import { syncWorkoutFromEntry } from "../controllers/workout.controller.js";
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

const dryRun = process.argv.includes("--dry-run");
const onlyUid = getArg("uid");

const run = async () => {
  await connectDB();

  const filter = onlyUid ? { uid: onlyUid } : {};
  const entries = await Entry.find(filter)
    .select("_id uid name description createdAt")
    .sort({ createdAt: 1 })
    .lean();

  let synced = 0;
  let cleared = 0;
  let skippedEmpty = 0;
  let failed = 0;

  for (const entry of entries) {
    const parsed = parseWorkoutDescription(entry.description || "");
    const existing = await Workout.findOne({ entryId: entry._id }).select("_id").lean();

    if (parsed.length === 0) {
      if (existing) {
        if (!dryRun) await Workout.deleteOne({ _id: existing._id });
        cleared += 1;
      } else {
        skippedEmpty += 1;
      }
      continue;
    }

    try {
      if (!dryRun) {
        await syncWorkoutFromEntry(entry, entry.uid);
      }
      synced += 1;
    } catch (error) {
      failed += 1;
      console.error("resync failed", {
        entryId: String(entry._id),
        uid: entry.uid,
        message: error?.message,
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        uid: onlyUid || null,
        entries: entries.length,
        synced,
        cleared,
        skippedEmpty,
        failed,
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
