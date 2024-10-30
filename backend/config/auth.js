export const connectAuth = async () => {
  async function verifyIdToken(req, res, next) {
    if (!idToken) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.user = {
        uid: decodedToken.uid,
        name: decodedToken.name,
        email: decodedToken.email,
        picture: decodedToken.picture,
      };
      return user;
    } catch (error) {
      console.error("Error while verifying Firebase ID token:", error);
      res.status(403).send("Unauthorized");
    }
  }
};

// export const connectAuth = async () => {
//   try {
//     console.log(result);
//     const token = await result.user.getIdToken();

//     const response = await fetch("http://localhost:5001/api/protected", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`,
//       },
//     });
//     if (!response.ok) {
//       throw new Error(await response.text());
//     }

//     const userData = await response.json();
//     console.log("User Data:", userData);
//   } catch (error) {
//     console.error("Error during sign-in:", error);
//   }
// };

// // import { admin } from "../firebase.js";
// // // import { verifyIdToken } from "./middleware/auth.js";

// // async function verifyIdToken(req, res, next) {
// //   const idToken = req.headers.authorization?.split("Bearer ")[1];

// //   if (!idToken) {
// //     return res.status(403).send("Unauthorized");
// //   }
// //   try {
// //     const decodedToken = await admin.auth().verifyIdToken(idToken);
// //     req.user = decodedToken;
// //     console.log("User1:", req.user);
// //     next();
// //   } catch (error) {
// //     console.error("Error while verifying Firebase ID token:", error);
// //     res.status(403).send("Unauthorized");
// //   }
// // }

// // // Example usage in an Express route
// // import express from "express";
// // import User from "../models/user.model.js"; //Assuming you have a User model

// // const app = express();

// // app.post("/api/protected", verifyIdToken, async (req, res) => {
// //   const { uid, name, email, picture } = req.user;

// //   let user = await User.findOne({ uid });

// //   if (!user) {
// //     user = new User({
// //       uid,
// //       name,
// //       email,
// //       picture,
// //     });
// //     await user.save();
// //   }
// //   res.send(user);
// //   console.log("User2:", user);
// // });

// // export { verifyIdToken };
