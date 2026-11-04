import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Fail immediately when not connected instead of buffering ~10s then throwing
// "Operation `….findOne()` buffering timed out after 10000ms" on Vercel.
mongoose.set("bufferCommands", false);

/** Reuse one connection across Vercel serverless invocations — do not close/reopen per request. */
const g = globalThis;
if (!g.__mongooseConnection) {
  g.__mongooseConnection = { promise: null };
}
const connection = g.__mongooseConnection;

const ATLAS_HINT =
  "Check Vercel MONGO_URI and MongoDB Atlas Network Access (allow 0.0.0.0/0 or Vercel egress IPs).";

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is not defined in environment variables.");
  }

  if (!connection.promise) {
    // Keep under typical Vercel hobby maxDuration so the client gets 503, not a hung request.
    connection.promise = mongoose
      .connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 20000,
        maxPoolSize: 10,
        bufferCommands: false,
      })
      .then(() => mongoose.connection);
  }

  try {
    await connection.promise;
    return mongoose.connection;
  } catch (err) {
    connection.promise = null;
    throw err;
  }
};

const waitForReadyState = async (states, maxWaitMs) => {
  let waited = 0;
  while (states.includes(mongoose.connection.readyState) && waited < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    waited += 100;
  }
};

/**
 * Serverless-friendly: wait if connecting (2), then connect if not ready.
 * Avoids false failures when readyState is 3 (disconnecting) between invocations.
 */
export const ensureMongoConnected = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error("[db] MONGO_URI is not set");
      return {
        ok: false,
        code: "DB_UNAVAILABLE",
        message:
          "Database is not configured (set MONGO_URI in the Vercel project environment).",
      };
    }

    if (mongoose.connection.readyState === 1) {
      return { ok: true };
    }

    // Connecting — wait briefly for the in-flight attempt from module load / prior request.
    if (mongoose.connection.readyState === 2) {
      await waitForReadyState([2], 5000);
      if (mongoose.connection.readyState === 1) {
        return { ok: true };
      }
    }

    // Disconnecting — wait for it to settle, then reconnect.
    if (mongoose.connection.readyState === 3) {
      await waitForReadyState([3], 2000);
    }

    if (mongoose.connection.readyState === 1) {
      return { ok: true };
    }

    // Previous attempt may have failed — allow a fresh connect
    if (mongoose.connection.readyState === 0) {
      connection.promise = null;
    }

    await connectDB();
    if (mongoose.connection.readyState === 1) {
      return { ok: true };
    }
    return {
      ok: false,
      code: "DB_UNAVAILABLE",
      message: `Database connection timeout. ${ATLAS_HINT}`,
    };
  } catch (e) {
    console.error("[db] ensureMongoConnected failed:", e?.message || e);
    connection.promise = null;
    const detail = e?.message ? String(e.message) : "Database connection error";
    return {
      ok: false,
      code: "DB_UNAVAILABLE",
      message: `${detail}. ${ATLAS_HINT}`,
    };
  }
};
