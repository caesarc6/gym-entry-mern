/**
 * Re-parse Entry descriptions into Workout rows (Progress).
 *
 * Safe to re-run: syncWorkoutFromEntry replaces exercises for each entry that
 * still parses as a workout, and deletes the Workout row when nothing parses.
 * Stores Workout.userId under the account canonical uid (same as create/edit).
 *
 * Manual only — not wired to the UI. Auto-process on create/edit stays as-is.
 *
 * Usage (from repo root or backend/):
 *   node backend/scripts/resync-workouts-from-entries.js --dry-run
 *   node backend/scripts/resync-workouts-from-entries.js --dry-run --uid=USER_UID
 *   node backend/scripts/resync-workouts-from-entries.js --dry-run --uid=USER_UID --since=2026-10-01
 *   node backend/scripts/resync-workouts-from-entries.js --dry-run --uid=USER_UID --days=45
 *   node backend/scripts/resync-workouts-from-entries.js --uid=USER_UID --days=45
 *
 * Prefer scoping with --uid (resolves linked firebase/supabase ids) plus
 * --days/--since for recent gaps. Run find-workout-sync-gaps.js first.
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "../config/db.js";
import Entry from "../models/entry.model.js";
import Workout from "../models/workout.model.js";
import { User } from "../models/user.model.js";
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
const sinceArg = getArg("since");
const daysArg = getArg("days");
const verbose = process.argv.includes("--verbose");

const resolveAccount = async (authUid) => {
  if (!authUid) return { uids: null, canonicalUid: null };
  const user = await User.findOne({
    $or: [{ uid: authUid }, { firebaseUid: authUid }, { supabaseUid: authUid }],
  })
    .select("uid firebaseUid supabaseUid")
    .lean();
  const uids = new Set([authUid]);
  if (user?.uid) uids.add(user.uid);
  if (user?.firebaseUid) uids.add(user.firebaseUid);
  if (user?.supabaseUid) uids.add(user.supabaseUid);
  return {
    uids: [...uids],
    canonicalUid: user?.uid || authUid,
  };
};

const run = async () => {
  await connectDB();

  const { uids, canonicalUid } = await resolveAccount(onlyUid);
  const filter = uids ? { uid: { $in: uids } } : {};

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
  if (since) filter.createdAt = { $gte: since };

  const entries = await Entry.find(filter)
    .select("_id uid name description createdAt")
    .sort({ createdAt: 1 })
    .lean();

  let synced = 0;
  let wouldSync = 0;
  let cleared = 0;
  let skippedEmpty = 0;
  let skippedEmptyLooksLikeLift = 0;
  let failed = 0;
  const skippedSamples = [];

  for (const entry of entries) {
    const parsed = parseWorkoutDescription(entry.description || "");
    const existing = await Workout.findOne({ entryId: entry._id })
      .select("_id userId")
      .lean();
    const ownerId = canonicalUid || entry.uid;

    if (parsed.length === 0) {
      if (existing) {
        if (!dryRun) await Workout.deleteOne({ _id: existing._id });
        cleared += 1;
      } else {
        skippedEmpty += 1;
        const preview = String(entry.description || "")
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .slice(0, 2);
        const liftish = preview.some(
          (line) =>
            /\d+(?:\.\d+)?\s*(?:lbs?|kg)\b/i.test(line) ||
            /\b\d+\s*x\s*\d+\b/i.test(line),
        );
        if (liftish) {
          skippedEmptyLooksLikeLift += 1;
          if (skippedSamples.length < 25) {
            skippedSamples.push({
              entryId: String(entry._id),
              createdAt: entry.createdAt,
              name: entry.name,
              preview,
            });
          }
        }
      }
      continue;
    }

    try {
      if (!dryRun) {
        await syncWorkoutFromEntry(entry, ownerId);
      }
      synced += 1;
      if (dryRun) wouldSync += 1;
      if (verbose) {
        console.error("sync", {
          entryId: String(entry._id),
          createdAt: entry.createdAt,
          exercises: parsed.length,
          hadWorkout: Boolean(existing),
        });
      }
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
        resolvedUids: uids,
        canonicalUid,
        since: since ? since.toISOString() : null,
        entries: entries.length,
        synced,
        wouldSync: dryRun ? synced : undefined,
        cleared,
        skippedEmpty,
        skippedEmptyLooksLikeLift,
        skippedSamples,
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
