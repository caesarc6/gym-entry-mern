import { admin } from "../firebase.js";
// import { verifyIdToken } from "./middleware/auth.js";

async function verifyIdToken(req, res, next) {
  console.log("🔍 [AUTH_MIDDLEWARE] verifyIdToken called");
  console.log("🔍 [AUTH_MIDDLEWARE] Request details:", {
    url: req.url,
    method: req.method,
    hasAuthHeader: !!req.headers.authorization,
    authHeader: req.headers.authorization
      ? req.headers.authorization.substring(0, 20) + "..."
      : "None",
  });

  const idToken = req.headers.authorization?.split("Bearer ")[1];

  if (!idToken) {
    console.error(
      "❌ [AUTH_MIDDLEWARE] No ID token found in authorization header"
    );
    return res.status(403).send("Unauthorized");
  }

  console.log("🔍 [AUTH_MIDDLEWARE] ID token found, verifying...");
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    console.log("✅ [AUTH_MIDDLEWARE] Token verified successfully:", {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
    });
    next();
  } catch (error) {
    console.error(
      "❌ [AUTH_MIDDLEWARE] Error while verifying Firebase ID token:",
      error
    );
    console.error("❌ [AUTH_MIDDLEWARE] Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    res.status(403).send("Unauthorized");
  }
}

// Example usage in an Express route
// import express from "express";
// import User from "../models/user.model.js"; //Assuming you have a User model

// const app = express();

// app.post("/api/protected", verifyIdToken, async (req, res) => {
//   const { uid, name, email, picture } = req.user;

//   let user = await User.findOne({ uid });

//   if (!user) {
//     user = new User({
//       uid,
//       name,
//       email,
//       picture,
//     });
//     await user.save();
//   }
//   res.send(user);
//   console.log("User2:", user);
// });

export { verifyIdToken };
