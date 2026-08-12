/**
 * @file server.js
 * @description Express application entry point for the Unfazed backend.
 *
 * Bootstraps the Express app, connects to MongoDB, and starts the HTTP server.
 * Controllers and routes will be mounted here as they are built.
 */

require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const cookieParser = require('cookie-parser');

const connectDB = require('./src/config/db');

// ─── Connect to Database ──────────────────────────────────────────────────────
connectDB();

// ─── App ──────────────────────────────────────────────────────────────────────
const app = express();

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet());          // Sets secure HTTP headers
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

// ─── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Body & Cookie Parsers ────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Unfazed API',
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1/auth',          require('./src/routes/auth.routes'));
app.use('/api/v1/clients',       require('./src/routes/client.routes'));
app.use('/api/v1/leads',         require('./src/routes/lead.routes'));
app.use('/api/v1/availability',  require('./src/routes/availability.routes'));
app.use('/api/v1/sessions',      require('./src/routes/session.routes'));
app.use('/api/v1/session-notes', require('./src/routes/sessionNote.routes'));
app.use('/api/v1/packages',      require('./src/routes/package.routes'));
app.use('/api/v1/payments',      require('./src/routes/payment.routes'));

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  if (process.env.NODE_ENV === 'development') {
    console.error(`[ERROR] ${statusCode} - ${message}\n`, err.stack);
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors: err.errors || [],
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Unfazed API running on http://localhost:${PORT} [${process.env.NODE_ENV}]`);
});

module.exports = app;
