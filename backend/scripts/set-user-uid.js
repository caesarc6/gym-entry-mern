/**
 * Point-in-time migration: replace one UID string with another everywhere
 * (User document + entries, comments, workouts, shared workouts, etc.)
 *
 * Usage:
 *   node backend/scripts/set-user-uid.js --from=OLD_FIREBASE_OR_SUPABASE_UID
 *   node backend/scripts/set-user-uid.js --from=OLD_UID --to=NEW_UID
 *   node backend/scripts/set-user-uid.js --email=user@example.com
 *
 * Default --to (new canonical uid) is the Supabase UUID you specified.
 * Use --dry-run to print counts without writing.
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "../config/db.js";
import { User } from "../models/user.model.js";
import { migrateUidStrings } from "./lib/migrateUidStrings.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_TO_UID = "18235bc8-a101-4695-aa6a-272cf7c3dcd0";

const rootEnvPath = path.resolve(__dirname, "../../.env");
const backendEnvPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: rootEnvPath });
dotenv.config({ path: backendEnvPath, override: true });

const getArg = (name) => {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
};

const hasFlag = (name) => process.argv.includes(`--${name}`);

const fromUid = getArg("from");
const toUid = getArg("to") || DEFAULT_TO_UID;
const email = getArg("email");

const buildUidQuery = (uid) => ({
  $or: [{ uid }, { firebaseUid: uid }, { supabaseUid: uid }],
});

const run = async () => {
  const dryRun = hasFlag("dry-run");

  if (!fromUid && !email) {
    console.error(`
Usage:
  node backend/scripts/set-user-uid.js --from=CURRENT_UID [--to=NEW_UID]
  node backend/scripts/set-user-uid.js --email=user@example.com [--to=NEW_UID]

Defaults:
  --to  ${DEFAULT_TO_UID}  (override with --to=...)

Options:
  --dry-run   Show what would happen without writing

Examples:
  node backend/scripts/set-user-uid.js --from=jcHPbCyDzqTADQntztqRnHA0Foz1
  node backend/scripts/set-user-uid.js --from=OLD --to=18235bc8-a101-4695-aa6a-272cf7c3dcd0 --dry-run
`);
    process.exit(1);
  }

  if (fromUid === toUid) {
    console.error("Error: --from and --to must differ.");
    process.exit(1);
  }

  try {
    await connectDB();

    let user = null;
    let resolvedFrom = fromUid;

    if (email) {
      user = await User.findOne({
        email: new RegExp(`^${String(email).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      });
      if (!user) {
        console.error(`No user found for email: ${email}`);
        process.exit(1);
      }
      // Prefer legacy Firebase id (often still on posts); else current primary uid
      const candidates = [
        user.firebaseUid,
        user.uid,
        user.supabaseUid,
      ].filter(Boolean);
      resolvedFrom = candidates.find((id) => id !== toUid) || null;
      if (!resolvedFrom) {
        console.error(
          "Could not infer a source UID different from --to. Use --from=OLD_UID explicitly."
        );
        process.exit(1);
      }
      console.log(`Resolved source UID from user record: ${resolvedFrom}`);
    } else {
      user = await User.findOne(buildUidQuery(fromUid));
      if (!user) {
        console.error(`No user found matching uid/firebaseUid/supabaseUid: ${fromUid}`);
        process.exit(1);
      }
      resolvedFrom = fromUid;
    }

    const conflict = await User.findOne({
      _id: { $ne: user._id },
      $or: [{ uid: toUid }, { supabaseUid: toUid }],
    }).select("_id email uid");

    if (conflict) {
      console.error(
        `Target uid already belongs to another user (${conflict.email}). Aborting.`
      );
      process.exit(1);
    }

    const firebaseUidToPreserve = user.firebaseUid || resolvedFrom;

    console.log({
      userId: user._id.toString(),
      email: user.email,
      from: resolvedFrom,
      to: toUid,
      dryRun,
    });

    if (dryRun) {
      const entryCount = await Entry.countDocuments({
        $or: [{ uid: resolvedFrom }, { trainerUid: resolvedFrom }],
      });
      console.log(`Would migrate (sample): entries referencing uid/trainerUid ~ ${entryCount}`);
      console.log("Re-run without --dry-run to apply.");
      process.exit(0);
    }

    const counts = await migrateUidStrings(resolvedFrom, toUid);

    await User.findByIdAndUpdate(user._id, {
      $set: {
        uid: toUid,
        supabaseUid: toUid,
        firebaseUid: firebaseUidToPreserve,
        authProvider: "supabase",
      },
    });

    console.log("Migration finished.");
    console.log("Related documents updated:", counts);
    console.log("User document set to uid / supabaseUid:", toUid);
    console.log("firebaseUid preserved as:", firebaseUidToPreserve);
  } catch (error) {
    console.error("Failed:", error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

run();
