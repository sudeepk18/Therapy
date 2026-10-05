/**
 * @file CrisisAlert.js
 * @description Mongoose model for Crisis Alerts (SOS Early-Warning Protocol).
 *
 * Records when the AI safety triager detects acute distress in a client's
 * text (journal entries, mood check-ins). Allows therapists to proactively
 * reach out before the next session.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Sub-schema: Risk Flag ──────────────────────────────────────────────────
const RiskFlagSchema = new Schema(
  {
    severity: {
      type: String,
      enum: ['critical', 'high', 'moderate'],
      required: true,
    },
    count:    { type: Number, default: 0 },
    keywords: [{ type: String }],
  },
  { _id: false }
);

// ─── Main Schema ────────────────────────────────────────────────────────────
const CrisisAlertSchema = new Schema(
  {
    // ── Ownership ──────────────────────────────────────────────────────────
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    therapistId: {
      type: Schema.Types.ObjectId,
      ref: 'Therapist',
      required: true,
      index: true,
    },

    // ── Source Context ──────────────────────────────────────────────────────
    source: {
      type: String,
      enum: ['journal', 'checkin', 'mood_log', 'cbt_thought'],
      default: 'journal',
    },
    sourceText: {
      type: String,
      maxlength: 10000,
    },

    // ── AI Risk Assessment ─────────────────────────────────────────────────
    riskLevel: {
      type: String,
      enum: ['critical', 'high', 'moderate', 'low'],
      required: true,
      index: true,
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    flags: [RiskFlagSchema],

    // ── Actions ────────────────────────────────────────────────────────────
    alertedTherapist: {
      type: Boolean,
      default: false,
    },
    shownCrisisUI: {
      type: Boolean,
      default: false,
    },

    // ── Therapist Response ─────────────────────────────────────────────────
    isReviewed: {
      type: Boolean,
      default: false,
      index: true,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    therapistNotes: {
      type: String,
      maxlength: 2000,
      default: '',
    },

    // ── AI metadata ────────────────────────────────────────────────────────
    aiModelVersion: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────
CrisisAlertSchema.index({ therapistId: 1, isReviewed: 1, createdAt: -1 });
CrisisAlertSchema.index({ clientId: 1, riskLevel: 1, createdAt: -1 });

module.exports = mongoose.model('CrisisAlert', CrisisAlertSchema);
