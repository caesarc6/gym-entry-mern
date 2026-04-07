import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

/** Reuse one connection across Vercel serverless invocations — do not close/reopen per request. */
const g = globalThis;
if (!g.__mongooseConnection) {
  g.__mongooseConnection = { promise: null };
}
const connection = g.__mongooseConnection;

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is not defined in environment variables.");
  }

  if (!connection.promise) {
    connection.promise = mongoose
      .connect(mongoUri, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
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
        message:
          "Database is not configured (set MONGO_URI on the server environment)",
      };
    }

    if (mongoose.connection.readyState === 1) {
      return { ok: true };
    }

    if (mongoose.connection.readyState === 2) {
      let waitTime = 0;
      const maxWait = 8000;
      while (mongoose.connection.readyState === 2 && waitTime < maxWait) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        waitTime += 100;
      }
      if (mongoose.connection.readyState === 1) {
        return { ok: true };
      }
    }

    if (mongoose.connection.readyState === 3) {
      let waitTime = 0;
      const maxWait = 3000;
      while (mongoose.connection.readyState === 3 && waitTime < maxWait) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        waitTime += 100;
      }
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
      message: "Database connection timeout",
    };
  } catch (e) {
    console.error("[db] ensureMongoConnected failed:", e?.message || e);
    connection.promise = null;
    return {
      ok: false,
      message: "Database connection error",
    };
  }
};
