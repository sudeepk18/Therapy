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

/**
 * Connect to MongoDB using the MONGO_URI environment variable.
 * Exits the process if the connection cannot be established on startup.
 *
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI) 

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1); // Exit with failure – let the process manager restart
  }
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
