/**
 * Replace a legacy UID string everywhere in MongoDB (including SharedWorkout.creatorUid).
 *
 * Defaults match your migration:
 *   from: jcHPbCyDzqTADQntztqRnHA0Foz1
 *   to:   18235bc8-a101-4695-aa6a-272cf7c3dcd0
 *
 * Usage:
 *   node backend/scripts/replace-uid-globally.js
 *   node backend/scripts/replace-uid-globally.js --from=OLD --to=NEW
 *   node backend/scripts/replace-uid-globally.js --dry-run
 *   node backend/scripts/replace-uid-globally.js --data-only   # skip User document update
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "../config/db.js";
import { User } from "../models/user.model.js";
import { migrateUidStrings } from "./lib/migrateUidStrings.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_FROM = "jcHPbCyDzqTADQntztqRnHA0Foz1";
const DEFAULT_TO = "18235bc8-a101-4695-aa6a-272cf7c3dcd0";

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

const buildUidQuery = (uid) => ({
  $or: [{ uid }, { firebaseUid: uid }, { supabaseUid: uid }],
});

const run = async () => {
  const fromUid = getArg("from") || DEFAULT_FROM;
  const toUid = getArg("to") || DEFAULT_TO;
  const dryRun = hasFlag("dry-run");
  const dataOnly = hasFlag("data-only");

  if (fromUid === toUid) {
    console.error("--from and --to must differ.");
    process.exit(1);
  }

  console.log({ fromUid, toUid, dryRun, dataOnly });

  try {
    await connectDB();

    const swCount = await mongoose.connection.db
      .collection("sharedworkouts")
      .countDocuments({ creatorUid: fromUid });
    console.log(`SharedWorkout docs with creatorUid=${fromUid}: ${swCount}`);

    if (dryRun) {
      console.log("Dry run: no writes. Remove --dry-run to apply.");
      await mongoose.connection.close();
      process.exit(0);
    }

    const counts = await migrateUidStrings(fromUid, toUid);
    console.log("Updated document counts:", counts);

    if (!dataOnly) {
      const conflict = await User.findOne({
        $or: [{ uid: toUid }, { supabaseUid: toUid }],
      })
        .select("_id email")
        .lean();

      const user = await User.findOne(buildUidQuery(fromUid));

      if (user) {
        if (conflict && conflict._id.toString() !== user._id.toString()) {
          console.warn(
            `Warning: another user already has uid/supabaseUid=${toUid} (${conflict.email}). Skipping User update.`
          );
        } else {
          const firebaseUidToPreserve = user.firebaseUid || fromUid;
          await User.findByIdAndUpdate(user._id, {
            $set: {
              uid: toUid,
              supabaseUid: toUid,
              firebaseUid: firebaseUidToPreserve,
              authProvider: "supabase",
            },
          });
          console.log("User document updated:", user._id.toString());
        }
      } else {
        console.log(
          "No User row matched this uid (data-only migration is fine for orphaned SharedWorkouts)."
        );
      }
    } else {
      console.log("--data-only: User collection left unchanged.");
    }
  } catch (error) {
    console.error("Failed:", error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

run();
