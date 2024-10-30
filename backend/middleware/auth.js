import { admin } from "../firebase.js";
// import { verifyIdToken } from "./middleware/auth.js";

async function verifyIdToken(req, res, next) {
  const idToken = req.headers.authorization?.split("Bearer ")[1];

  if (!idToken) {
    return res.status(403).send("Unauthorized");
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    console.log("User1:", req.user);
    next();
  } catch (error) {
    console.error("Error while verifying Firebase ID token:", error);
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
