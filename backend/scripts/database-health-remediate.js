/**
 * Safe Atlas remediations for the database health audit.
 *
 * Default is dry-run. Pass --apply to write.
 * Never prints secrets, emails, tokens, or other PII.
 *
 * Usage:
 *   node scripts/database-health-remediate.js
 *   node scripts/database-health-remediate.js --apply
 */
import "dotenv/config";
import mongoose from "mongoose";

const APPLY = process.argv.includes("--apply");

const summarize = (label, count, extra = {}) => {
  console.log(JSON.stringify({ action: label, count, apply: APPLY, ...extra }));
};

async function unsetNullShareTokens(db) {
  const entries = db.collection("entries");
  const filter = { shareToken: null };
  const count = await entries.countDocuments(filter);
  summarize("entries.unset_null_shareToken", count);
  if (APPLY && count > 0) {
    const result = await entries.updateMany(filter, {
      $unset: { shareToken: "", shareExpiry: "" },
    });
    summarize("entries.unset_null_shareToken.applied", result.modifiedCount);
  }
}

async function ensureIndexes(db) {
  const plans = [];

  // entries
  const entries = db.collection("entries");
  plans.push(
    entries.createIndex(
      { shareToken: 1 },
      {
        unique: true,
        name: "shareToken_1",
        background: true,
        partialFilterExpression: { shareToken: { $type: "string" } },
      },
    ),
  );
  plans.push(
    entries.createIndex(
      { sharedWorkoutId: 1 },
      { sparse: true, name: "sharedWorkoutId_1", background: true },
    ),
  );

  // users — sparse unique username (field may already declare unique)
  const users = db.collection("users");
  plans.push(
    users.createIndex(
      { username: 1 },
      { unique: true, sparse: true, name: "username_1", background: true },
    ),
  );
  plans.push(
    users.createIndex({ followers: 1 }, { name: "followers_1", background: true }),
  );

  // workoutassignments — correct field names
  const assignments = db.collection("workoutassignments");
  plans.push(
    assignments.createIndex(
      { sharedByUid: 1, createdAt: -1 },
      { name: "sharedByUid_1_createdAt_-1", background: true },
    ),
  );
  plans.push(
    assignments.createIndex(
      { sharedWorkoutId: 1 },
      { name: "sharedWorkoutId_1", background: true },
    ),
  );

  // reports
  const reports = db.collection("reports");
  plans.push(
    reports.createIndex(
      { reporterUid: 1, createdAt: -1 },
      { name: "reporterUid_1_createdAt_-1", background: true },
    ),
  );
  plans.push(
    reports.createIndex(
      { entryId: 1, createdAt: -1 },
      { name: "entryId_1_createdAt_-1", background: true },
    ),
  );

  // clientsharelinks TTL
  const links = db.collection("clientsharelinks");
  plans.push(
    links.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0, name: "expiresAt_ttl", background: true },
    ),
  );
  plans.push(
    links.createIndex(
      { creatorUid: 1, expiresAt: -1 },
      { name: "creatorUid_1_expiresAt_-1", background: true },
    ),
  );

  if (!APPLY) {
    summarize("indexes.ensure.planned", plans.length);
    return;
  }

  for (const p of plans) {
    try {
      await p;
    } catch (err) {
      // Index already exists with same options is fine; conflicts are reported.
      console.log(
        JSON.stringify({
          action: "indexes.ensure.error",
          message: err?.message || String(err),
          code: err?.code,
        }),
      );
    }
  }
  summarize("indexes.ensure.applied", plans.length);
}

async function dropDeadIndexes(db) {
  const drops = [
    ["users", "supabaseUserId_1"],
    ["workoutassignments", "assignedByUid_1_createdAt_-1"],
    ["workoutassignments", "templateId_1"],
    ["sharedworkouts", "category_1_difficulty_1"],
  ];

  for (const [coll, indexName] of drops) {
    const indexes = await db.collection(coll).indexes();
    const exists = indexes.some((i) => i.name === indexName);
    if (!exists) {
      summarize("indexes.drop.skip", 0, { collection: coll, index: indexName });
      continue;
    }
    if (!APPLY) {
      summarize("indexes.drop.planned", 1, { collection: coll, index: indexName });
      continue;
    }
    await db.collection(coll).dropIndex(indexName);
    summarize("indexes.drop.applied", 1, { collection: coll, index: indexName });
  }
}

async function remediateLikes(db) {
  const entries = db.collection("entries");
  const filter = { likes: { $type: "int" } };
  const count = await entries.countDocuments(filter);
  summarize("likes.int_to_empty_array", count);
  if (APPLY && count > 0) {
    const result = await entries.updateMany(filter, { $set: { likes: [] } });
    summarize("likes.int_to_empty_array.applied", result.modifiedCount);
  }
}

async function backfillAssignmentFields(db) {
  const assignments = db.collection("workoutassignments");

  const trainerFilter = {
    assignedByUid: { $exists: true, $nin: [null, ""] },
    $or: [
      { sharedByUid: { $exists: false } },
      { sharedByUid: null },
      { sharedByUid: "" },
    ],
  };
  const trainerCount = await assignments.countDocuments(trainerFilter);
  summarize("assignments.backfill.sharedByUid", trainerCount);
  if (APPLY && trainerCount > 0) {
    const docs = await assignments
      .find(trainerFilter)
      .project({ assignedByUid: 1, assignedByName: 1 })
      .toArray();
    let modified = 0;
    for (const doc of docs) {
      const set = { sharedByUid: doc.assignedByUid };
      if (doc.assignedByName) set.sharedByName = doc.assignedByName;
      const r = await assignments.updateOne({ _id: doc._id }, { $set: set });
      modified += r.modifiedCount;
    }
    summarize("assignments.backfill.sharedByUid.applied", modified);
  }

  const templateFilter = {
    templateId: { $exists: true, $ne: null },
    $or: [{ sharedWorkoutId: { $exists: false } }, { sharedWorkoutId: null }],
  };
  const templateCount = await assignments.countDocuments(templateFilter);
  summarize("assignments.backfill.sharedWorkoutId", templateCount);
  if (APPLY && templateCount > 0) {
    const docs = await assignments
      .find(templateFilter)
      .project({ templateId: 1 })
      .toArray();
    let modified = 0;
    for (const doc of docs) {
      const r = await assignments.updateOne(
        { _id: doc._id },
        { $set: { sharedWorkoutId: doc.templateId } },
      );
      modified += r.modifiedCount;
    }
    summarize("assignments.backfill.sharedWorkoutId.applied", modified);
  }
}

async function clearExpiredShareTokens(db) {
  const shared = db.collection("sharedworkouts");
  // Unset rather than set null — unique sparse shareToken_1 indexes null.
  const expiredFilter = {
    shareToken: { $type: "string" },
    shareTokenExpiresAt: { $lte: new Date() },
  };
  const nullFilter = { shareToken: null };
  const expiredCount = await shared.countDocuments(expiredFilter);
  const nullCount = await shared.countDocuments(nullFilter);
  summarize("shared.clear_expired_share_tokens", expiredCount);
  summarize("shared.unset_null_shareToken", nullCount);
  if (APPLY) {
    if (expiredCount > 0) {
      const result = await shared.updateMany(expiredFilter, {
        $unset: { shareToken: "", shareTokenExpiresAt: "" },
      });
      summarize(
        "shared.clear_expired_share_tokens.applied",
        result.modifiedCount,
      );
    }
    if (nullCount > 0) {
      const result = await shared.updateMany(nullFilter, {
        $unset: { shareToken: "", shareTokenExpiresAt: "" },
      });
      summarize("shared.unset_null_shareToken.applied", result.modifiedCount);
    }
  }
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI missing");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
  });
  const db = mongoose.connection.db;

  console.log(JSON.stringify({ mode: APPLY ? "apply" : "dry-run" }));

  await unsetNullShareTokens(db);
  await ensureIndexes(db);
  await dropDeadIndexes(db);
  await remediateLikes(db);
  await backfillAssignmentFields(db);
  await clearExpiredShareTokens(db);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(JSON.stringify({ fatal: true, message: err?.message || String(err) }));
  process.exit(1);
});
