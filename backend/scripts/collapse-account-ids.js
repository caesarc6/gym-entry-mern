/**
 * Point every stored id for an account at its Supabase id, then drop firebaseUid
 * only when nothing still references the old ids.
 *
 * Accounts with no Supabase id are left unchanged. The API lookup still matches
 * uid, firebaseUid, and supabaseUid until this has been applied.
 *
 * Usage:
 *   node backend/scripts/collapse-account-ids.js
 *   node backend/scripts/collapse-account-ids.js --apply
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "../config/db.js";
import { User } from "../models/user.model.js";
import {
  countUidReferences,
  migrateUidStrings,
  referenceTotal,
} from "./lib/migrateUidStrings.js";
import {
  canonicalSupabaseUid,
  legacyIdsToRewrite,
} from "../utils/accountIds.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

const apply = process.argv.includes("--apply");

const run = async () => {
  await connectDB();
  const users = await User.find({
    $or: [
      { firebaseUid: { $exists: true, $ne: null } },
      { supabaseUid: { $exists: true, $ne: null } },
    ],
  })
    .select("uid firebaseUid supabaseUid email")
    .lean();

  let rewritten = 0;
  let cleared = 0;
  let blocked = 0;
  let skipped = 0;
  let pending = 0;

  for (const user of users) {
    const canonical = canonicalSupabaseUid(user);
    if (!canonical) {
      blocked += 1;
      console.log(
        `blocked ${user.email || user._id}: no Supabase id, uid=${user.uid}`
      );
      continue;
    }

    const conflict = await User.findOne({
      uid: canonical,
      _id: { $ne: user._id },
    })
      .select("email")
      .lean();
    if (conflict) {
      blocked += 1;
      console.log(
        `blocked ${user.email || user._id}: ${canonical} already belongs to ${conflict.email}`
      );
      continue;
    }

    const legacyIds = legacyIdsToRewrite(user, canonical);
    if (legacyIds.length === 0 && !user.firebaseUid) {
      skipped += 1;
      continue;
    }

    console.log(
      `${apply ? "apply" : "dry-run"} ${user.email || user._id}: ${
        legacyIds.join(", ") || "(firebaseUid duplicates the Supabase id)"
      } -> ${canonical}`
    );
    pending += 1;

    if (!apply) continue;

    for (const legacyId of legacyIds) {
      const counts = await migrateUidStrings(legacyId, canonical);
      console.log(`  rewritten ${legacyId}`, counts);
    }

    let remaining = 0;
    for (const legacyId of legacyIds) {
      const counts = await countUidReferences(legacyId);
      const total = referenceTotal(counts);
      remaining += total;
      if (total > 0) {
        console.log(`  still referenced ${legacyId}`, counts);
      }
    }

    const $set = { uid: canonical, supabaseUid: canonical, authProvider: "supabase" };
    const update = { $set };
    if (remaining === 0) {
      update.$unset = { firebaseUid: "" };
      cleared += 1;
    }
    await User.updateOne({ _id: user._id }, update);
    rewritten += 1;
  }

  console.log({
    mode: apply ? "apply" : "dry-run",
    examined: users.length,
    pending,
    rewritten,
    clearedFirebaseUid: cleared,
    blocked,
    alreadyCollapsed: skipped,
  });
};

run()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => {});
  });
