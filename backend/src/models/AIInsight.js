/**
 * @file AIInsight.js
 * @description Mongoose model for cached AI-generated insights.
 *
 * Stores aggregate AI results (scheduling recommendations, revenue forecasts,
 * engagement summaries) that are expensive to compute and can be cached.
 *
 * TTL: Documents expire via the `expiresAt` field + MongoDB TTL index.
 *
 * Types:
 *   'noShow'     — Upcoming session risk summary
 *   'sentiment'  — Client engagement trend summary
 *   'forecast'   — Revenue forecast result
 *   'scheduling' — Recommended slot list
 *   'soap'       — (Not cached — generated on demand)
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const AIInsightSchema = new Schema(
  {
    // The therapist this insight belongs to
    therapistId: {
      type: Schema.Types.ObjectId,
      ref: 'Therapist',
      required: true,
      index: true,
    },

    // The type of AI insight stored
    type: {
      type: String,
      enum: ['noShow', 'sentiment', 'forecast', 'scheduling', 'soap'],
      required: true,
    },

    // The computed insight value (flexible — shape varies by type)
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },

    // Model/algorithm version that produced this insight
    modelVersion: {
      type: String,
      trim: true,
    },

    // When this insight was generated
    generatedAt: {
      type: Date,
      default: Date.now,
    },

    // When this cached insight should be considered stale
    // MongoDB TTL index automatically removes expired documents
    expiresAt: {
      type: Date,
      required: true,
    },

    // Additional context (e.g. clientId for sentiment, forecast_months, etc.)
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
// Allows quick lookup of the most recent cached insight of each type per therapist
AIInsightSchema.index({ therapistId: 1, type: 1, generatedAt: -1 });

// TTL index: MongoDB auto-deletes documents once expiresAt has passed
AIInsightSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ─── Export ───────────────────────────────────────────────────────────────────
const AIInsight = mongoose.model('AIInsight', AIInsightSchema);
module.exports = AIInsight;
