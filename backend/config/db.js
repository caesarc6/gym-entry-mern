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
