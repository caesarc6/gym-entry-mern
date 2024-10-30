import admin from "firebase-admin";

import serviceAccount from "./ethereal-gains-firebase-adminsdk-ipqvh-32d83a52d2.json" assert { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// module.exports = admin;
export { admin };
