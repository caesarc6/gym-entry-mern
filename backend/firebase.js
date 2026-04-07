// Import Buffer polyfill BEFORE firebase-admin to ensure Buffer is available
// when jsonwebtoken (a dependency of firebase-admin) loads buffer-equal-constant-time
import "./polyfills/buffer.js";

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import admin from "firebase-admin";

dotenv.config();

const accountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
let initialized = false;

if (accountPath) {
  const resolved = path.isAbsolute(accountPath)
    ? accountPath
    : path.resolve(process.cwd(), accountPath);
  if (fs.existsSync(resolved)) {
    const serviceAccount = JSON.parse(fs.readFileSync(resolved, "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    initialized = true;
  } else {
    // Vercel/production often sets a local path that is not deployed — fall back to env vars.
    console.warn(
      `[firebase] FIREBASE_SERVICE_ACCOUNT_PATH file not found (${resolved}); using FIREBASE_* env vars if set.`,
    );
  }
}

if (!initialized) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase admin needs either a readable FIREBASE_SERVICE_ACCOUNT_PATH JSON file " +
        "or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in the environment.",
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export { admin };
