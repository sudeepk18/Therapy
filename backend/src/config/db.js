/**
 * @file db.js
 * @description MongoDB connection setup using Mongoose.
 *
 * Establishes and manages the database connection. Emits lifecycle events
 * (connected, error, disconnected) so the application can react appropriately.
 *
 * Usage:
 *   const connectDB = require('./config/db');
 *   connectDB();
 */

const mongoose = require('mongoose');

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Connect to MongoDB using the MONGO_URI environment variable.
 * Reuses active connection pool across serverless invocations (Vercel).
 *
 * @returns {Promise<typeof mongoose>}
 */
const connectDB = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.warn('⚠️ MONGO_URI environment variable is missing.');
    return null;
  }

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
    };

    cached.promise = mongoose.connect(uri, opts).then((m) => {
      console.log(`✅ MongoDB connected: ${m.connection.host}`);
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error(`❌ MongoDB connection error: ${error.message}`);
    if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
    throw error;
  }

  return cached.conn;
};

// ─── Connection Event Listeners ──────────────────────────────────────────────

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected. Attempting to reconnect…');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB reconnected.');
});

mongoose.connection.on('error', (err) => {
  console.error(`MongoDB error: ${err.message}`);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

// Close the connection when the Node process terminates
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed (SIGINT).');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed (SIGTERM).');
  process.exit(0);
});

module.exports = connectDB;
