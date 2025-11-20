// Import Buffer polyfill BEFORE firebase-admin to ensure Buffer is available
// when jsonwebtoken (a dependency of firebase-admin) loads buffer-equal-constant-time
import "./polyfills/buffer.js";

import admin from "firebase-admin";

import serviceAccount from "./ethereal-gains-firebase-adminsdk-ipqvh-32d83a52d2.json" with { type: "json"};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// module.exports = admin;
export { admin };
