import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { connectDB } from "../config/db.js";
import Entry from "../models/entry.model.js";

const rootEnvPath = path.resolve(process.cwd(), ".env");
const backendEnvPath = path.resolve(process.cwd(), "backend", ".env");
dotenv.config({ path: rootEnvPath });
dotenv.config({ path: backendEnvPath, override: true });

const getArg = (name) => {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
};

const fromUid = getArg("from");
const toUid = getArg("to");

if (!fromUid || !toUid) {
  console.error(
    "Usage: node scripts/migrate-entry-uid.js --from=OLD_UID --to=NEW_UID"
  );
  process.exit(1);
}

const run = async () => {
  try {
    await connectDB();

    const result = await Entry.updateMany(
      { uid: fromUid },
      { $set: { uid: toUid } }
    );

    console.log("Entry UID migration complete:", {
      fromUid,
      toUid,
      matched: result.matchedCount ?? result.n,
      modified: result.modifiedCount ?? result.nModified,
    });
  } catch (error) {
    console.error("Failed to migrate entry UIDs:", error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

run();
