import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

let isConnecting = false;
let connectionPromise = null;

export const connectDB = async () => {
  // If already connected, return
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // If already connecting, return the existing promise
  if (isConnecting && connectionPromise) {
    return connectionPromise;
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    const error = new Error("MONGO_URI is not defined in environment variables.");
    // In serverless, don't exit - throw error instead
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
    process.exit(1);
  }

  isConnecting = true;
  connectionPromise = (async () => {
    try {
      // If disconnected, close existing connection first
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }

      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000, // 5 second timeout
        socketTimeoutMS: 45000, // 45 second socket timeout
      });
      isConnecting = false;
      return conn;
    } catch (error) {
      isConnecting = false;
      connectionPromise = null;
      // In serverless, don't exit - throw error instead
      if (process.env.NODE_ENV === "production") {
        throw error;
      }
      process.exit(1);
    }
  })();

  return connectionPromise;
};

/**
 * Serverless-friendly: reconnect when disconnected (0), disconnecting (3), or unknown,
 * wait when connecting (2). Avoids false 500s when readyState is 3 between invocations.
 */
export const ensureMongoConnected = async () => {
  if (mongoose.connection.readyState === 1) {
    return { ok: true };
  }

  if (mongoose.connection.readyState === 2) {
    let waitTime = 0;
    const maxWait = 5000;
    while (mongoose.connection.readyState === 2 && waitTime < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      waitTime += 100;
    }
    if (mongoose.connection.readyState === 1) {
      return { ok: true };
    }
  }

  try {
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
    return {
      ok: false,
      message: "Database connection error",
    };
  }
};
