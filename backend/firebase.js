// Import Buffer polyfill BEFORE firebase-admin to ensure Buffer is available
// when jsonwebtoken (a dependency of firebase-admin) loads buffer-equal-constant-time
import "./polyfills/buffer.js";

import dotenv from "dotenv";
import admin from "firebase-admin";

dotenv.config();

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  throw new Error(
    "Firebase admin requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in the environment."
  );
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  }),
});

export { admin };
