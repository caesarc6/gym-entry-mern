// Buffer polyfill for Node.js compatibility
// Import polyfill early to ensure Buffer is available globally
import "../polyfills/buffer.js";

import express from "express";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import { connectAuth } from "../config/auth.js";
import { connectDB, ensureMongoConnected } from "../config/db.js";
import { verifyIdToken } from "../middleware/auth.js";
import entryRoutes from "../routes/entry.route.js";
import userRoutes from "../routes/user.route.js";
import workoutRoutes from "../routes/workout.route.js";
import sharedWorkoutRoutes from "../routes/sharedWorkout.route.js";

import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import {
  duplicateKeyField,
  shouldReportCreated,
} from "../utils/accountProvision.js";

const usernameBase = (name) => {
  const stripped = String(name || "")
    .replace(/\s+/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
  return stripped || "user";
};

const allocateUsername = async (name) => {
  const base = usernameBase(name);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = attempt === 0 ? "" : Math.random().toString(36).slice(2, 6);
    const candidate = `${base}${suffix}`.slice(0, 32);
    const taken = await User.exists({ username: candidate });
    if (!taken) return candidate;
  }
  return `${base}${Date.now().toString(36)}`.slice(0, 32);
};
import { migrateUserData } from "../controllers/migration.controller.js";
import { legacyIdsToRewrite } from "../utils/accountIds.js";
import Entry from "../models/entry.model.js";
import bodyParser from "body-parser";
// const bodyParser = require("body-parser");

// Load environment variables first
dotenv.config();

// Connect to database (don't await - let it connect in background)
// But we'll check connection state in routes
connectDB().catch((error) => {
  // Don't exit in serverless - let it retry on next request
});

connectAuth();

const app = express();

// Configure body parser with higher limits for image uploads
app.use(express.json({ limit: "50mb" })); // allows to use json data in the body with 50MB limit
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
app.use(bodyParser.json({ limit: "50mb" }));
// app.use(express.urlencoded({ extended: true }));

// Configure CORS with environment variables
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:5173"];

// Add production domains that should always be allowed
const productionDomains = [
  "https://www.etherealgains.com",
  "https://etherealgains.com",
  "https://etherealgains.vercel.app",
];

// Capacitor WebViews use custom schemes; live reload uses the Vite LAN origin
// (e.g. http://192.168.1.x:5173), which changes with the Mac's Wi-Fi IP.
const capacitorOrigins = [
  "capacitor://localhost",
  "ionic://localhost",
  "https://localhost",
];

const allAllowedOrigins = [
  ...new Set([...allowedOrigins, ...productionDomains, ...capacitorOrigins]),
];

function isPrivateLanHostname(hostname) {
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return true;
  }
  const parts = hostname.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) {
    return false;
  }
  const octets = parts.map(Number);
  if (octets.some((n) => n > 255)) {
    return false;
  }
  const [a, b] = octets;
  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
}

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }
  if (allAllowedOrigins.includes(origin)) {
    return true;
  }
  try {
    const url = new URL(origin);
    if (url.protocol === "capacitor:" || url.protocol === "ionic:") {
      return url.hostname === "localhost";
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }
    return isPrivateLanHostname(url.hostname);
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Not allowed by CORS. Origin: ${origin}`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-workout-calendar-tz",
    ],
  })
);

// Add request logging middleware BEFORE routes
app.use((req, res, next) => {
  next();
});

const __dirname = path.resolve();
// write a middleware to check if the user is authenticated and create a user in the database if it doesn't exist
app.post("/api/protected", verifyIdToken, async (req, res) => {
  try {
    // Check if req.user exists (should be set by verifyIdToken middleware)
    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: User information not found",
      });
    }

    const { uid, name, email, picture } = req.user;
    if (!uid) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Token did not include a user id",
      });
    }

    const dbReady = await ensureMongoConnected();
    if (!dbReady.ok) {
      return res.status(500).json({
        success: false,
        message: dbReady.message || "Database connection error",
      });
    }

    // Determine auth provider from req.user (set by middleware)
    const authProvider = req.user.authProvider || "firebase";
    const firebaseUid =
      req.user.firebaseUid || (authProvider === "firebase" ? uid : null);
    const supabaseUid =
      req.user.supabaseUid || (authProvider === "supabase" ? uid : null);

    let user;
    let created = false;
    let foundBefore = false;
    try {
      const lookupConditions = [{ uid }];

      if (firebaseUid) {
        lookupConditions.push({ firebaseUid });
      }

      if (supabaseUid) {
        lookupConditions.push({ supabaseUid });
      }

      if (email) {
        lookupConditions.push({ email });
      }

      // Try to find user by any matching UID (uid, firebaseUid, or supabaseUid)
      user = await User.findOne({
        $or: lookupConditions,
      });
      foundBefore = Boolean(user);
    } catch (dbError) {
      return res.status(500).json({
        success: false,
        message: "Database query error",
        error: process.env.NODE_ENV === "development" ? dbError.message : undefined,
      });
    }

    if (!user) {
      const safeEmail =
        email && String(email).trim()
          ? String(email).trim().toLowerCase()
          : `${uid}@oauth.noreply.local`;

      const userData = {
        uid, // Primary UID
        name: name || "User",
        email: safeEmail,
        picture,
        authProvider,
        bio: null,
        goal: null,
        gymName: null,
        backgroundPicture: null,
      };

      // Set provider-specific UID fields
      if (authProvider === "firebase") {
        userData.firebaseUid = uid;
      } else if (authProvider === "supabase") {
        userData.supabaseUid = uid;
      }

      try {
        let saved = false;
        let saveError = null;
        for (let attempt = 0; attempt < 6 && !saved; attempt += 1) {
          userData.username = await allocateUsername(name);
          try {
            user = new User(userData);
            await user.save();
            created = true;
            saved = true;
          } catch (error) {
            saveError = error;
            if (duplicateKeyField(error) !== "username") break;
          }
        }

        if (!saved) {
          const conflict = duplicateKeyField(saveError);
          if (conflict === "identity" || conflict === "email" || conflict === "unknown") {
            const retryConditions = [{ uid }];
            if (firebaseUid) {
              retryConditions.push({ firebaseUid });
            }
            if (supabaseUid) {
              retryConditions.push({ supabaseUid });
            }
            if (email) {
              retryConditions.push({ email: safeEmail });
            }

            user = await User.findOne({
              $or: retryConditions,
            });
            if (!user) {
              return res.status(500).json({
                success: false,
                message: "Failed to create user",
                error: process.env.NODE_ENV === "development" ? saveError.message : undefined,
              });
            }
            // Parallel sign-in inserted this Apple id first. That row is new;
            // do not tell the client the account already existed.
            if (
              shouldReportCreated({
                foundBefore,
                inserted: false,
                recoveredCreatedAt: user.createdAt,
              })
            ) {
              created = true;
            }
          } else {
            console.error("[api/protected] user.save failed:", saveError?.message, saveError?.code);
            return res.status(500).json({
              success: false,
              message: "Failed to create user",
              error:
                saveError?.name === "ValidationError"
                  ? saveError.message
                  : process.env.NODE_ENV === "development"
                    ? saveError.message
                    : undefined,
              code: saveError?.code,
            });
          }
        }
      } catch (saveError) {
        console.error("[api/protected] user.save failed:", saveError?.message, saveError?.code);
        return res.status(500).json({
          success: false,
          message: "Failed to create user",
          error:
            saveError?.name === "ValidationError"
              ? saveError.message
              : process.env.NODE_ENV === "development"
                ? saveError.message
                : undefined,
          code: saveError?.code,
        });
      }
    } else {
      // Returning user on Supabase: if Mongo still uses the legacy Firebase UID as
      // primary `uid`, promote the Supabase UID and rewrite related documents.
      if (
        authProvider === "supabase" &&
        email &&
        user.email?.toLowerCase() === email.toLowerCase()
      ) {
        if (user.supabaseUid && user.supabaseUid !== uid) {
          return res.status(409).json({
            success: false,
            message:
              "This email is associated with a different Supabase account in our records.",
          });
        }
        const legacyIds = legacyIdsToRewrite(user, uid);
        if (user.uid !== uid || legacyIds.length > 0) {
          const firebaseUidToPreserve = user.firebaseUid || user.uid;
          const nextUser = {
            uid,
            supabaseUid: uid,
            authProvider: "supabase",
          };
          if (firebaseUidToPreserve && firebaseUidToPreserve !== uid) {
            nextUser.firebaseUid = firebaseUidToPreserve;
          }
          try {
            user = await User.findOneAndUpdate(
              { _id: user._id },
              { $set: nextUser },
              { new: true }
            );
            for (const legacyId of legacyIds) {
              await migrateUserData(legacyId, uid);
            }
          } catch (migrationError) {
            console.error("Supabase UID migration error:", migrationError);
            return res.status(500).json({
              success: false,
              message: "Failed to migrate account to new authentication uid",
              error:
                process.env.NODE_ENV === "development"
                  ? migrationError.message
                  : undefined,
            });
          }
        }
      }

      // User exists - update UID fields if needed (backfill provider-specific ids)
      const updateFields = {};

      const isSameProvider = !user.authProvider || user.authProvider === authProvider;

      if (authProvider === "firebase" && !user.firebaseUid) {
        updateFields.firebaseUid = uid;
      } else if (authProvider === "supabase" && !user.supabaseUid) {
        updateFields.supabaseUid = uid;
      }

      if (authProvider === "supabase" && !user.supabaseUid && email) {
        updateFields.supabaseUid = uid;
      }

      if (isSameProvider) {
        updateFields.authProvider = authProvider;
        if (user.uid !== uid) {
          updateFields.uid = uid;
        }
      }

      if (Object.keys(updateFields).length > 0) {
        try {
          user = await User.findOneAndUpdate(
            { _id: user._id },
            { $set: updateFields },
            { new: true }
          );
        } catch (updateError) {
          console.error("Error updating user UID fields:", updateError);
        }
      }
    }

    const userJson =
      user && typeof user.toJSON === "function" ? user.toJSON() : user;

    res.status(200).json({
      success: true,
      created,
      data: userJson,
    });
  } catch (error) {
    console.error("[api/protected] error:", error?.stack || error?.message || error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      details:
        process.env.NODE_ENV === "development" ? error?.message : undefined,
      code: error?.code,
    });
  }
});
// Routes

app.use("/api/entrys", entryRoutes);
app.use("/api/", userRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/api/shared-workouts", sharedWorkoutRoutes);

app.get("/api", (req, res) => {
  res.send("Server deployed and running on vercel.");
});

// Temporary test endpoints (removed to avoid conflicts with actual routes)
// app.get("/api/entrys/test", (req, res) => {
//   res.json({ message: "Entries endpoint is working!" });
// });

// app.get("/api/getCurrentUser", (req, res) => {
//   res.json({ message: "User endpoint is working!" });
// });

// app.get("/api/posts/:uid", (req, res) => {
//   res.json({ message: "Posts endpoint is working!", uid: req.params.uid });
// });

// Error handling middleware
app.use((err, req, res, next) => {

  // Handle CORS errors specifically
  if (err.message && err.message.includes("Not allowed by CORS")) {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    return res.status(403).json({
      success: false,
      message: "CORS Error: Origin not allowed",
      error: process.env.NODE_ENV === "development"
        ? `Origin ${origin} is not in ALLOWED_ORIGINS`
        : "Origin not allowed",
    });
  }

  // Handle payload too large errors specifically
  if (err.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "File too large. Please upload a smaller image.",
      error: "Payload too large",
    });
  }

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    method: req.method,
    url: req.url,
  });
});

// For Vercel deployment, we don't serve static files here
// Vercel handles the frontend routing separately

const PORT = process.env.PORT || 5001;

// Only start the server if we're not in Vercel
if (process.env.NODE_ENV !== "production") {
  const server = app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `Port ${PORT} is already in use. Stop the other server or run: lsof -nP -iTCP:${PORT} -sTCP:LISTEN`
      );
    } else {
      console.error(err);
    }
    process.exit(1);
  });
}

// Export for Vercel
export default app;
