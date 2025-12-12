import { admin } from "../firebase.js";
// import { verifyIdToken } from "./middleware/auth.js";

async function verifyIdToken(req, res, next) {
  const idToken = req.headers.authorization?.split("Bearer ")[1];

  if (!idToken) {
    return res.status(403).json({
      success: false,
      message: "Unauthorized: No authentication token provided",
    });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    // Provide more specific error messages
    if (error.code === "auth/id-token-expired") {
      return res.status(403).json({
        success: false,
        message: "Token expired. Please log out and log back in.",
        code: "TOKEN_EXPIRED",
      });
    }

    return res.status(403).json({
      success: false,
      message: "Unauthorized: Invalid or expired authentication token",
      code: "AUTH_FAILED",
    });
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
// });

export { verifyIdToken };
