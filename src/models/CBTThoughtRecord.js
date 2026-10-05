/**
 * @file CBTThoughtRecord.js
 * @description Mongoose model for CBT Thought Records (Between-Session Homework).
 *
 * Records a client's negative automatic thought, the AI-detected cognitive
 * distortions, and the guided 3-step reframing exercise completed by the client.
 * These records allow therapists to review between-session homework before
 * the next appointment.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Sub-schema: Detected Distortion ────────────────────────────────────────
const DetectedDistortionSchema = new Schema(
  {
    type:           { type: String, required: true },   // e.g. 'catastrophizing'
    label:          { type: String, required: true },   // e.g. 'Catastrophizing'
    description:    { type: String },
    confidence:     { type: Number, min: 0, max: 1 },
    reframePrompts: [{ type: String }],
  },
  { _id: false }
);

// ─── Main Schema ────────────────────────────────────────────────────────────
const CBTThoughtRecordSchema = new Schema(
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

    // ── Step 1: Automatic Thought ──────────────────────────────────────────
    automaticThought: {
      type: String,
      required: [true, 'Automatic thought text is required'],
      maxlength: 5000,
    },

    // ── Step 2: AI Analysis ────────────────────────────────────────────────
    distortions: [DetectedDistortionSchema],
    primaryDistortion: {
      type: String,
      default: 'none',
    },
    distortionCount: {
      type: Number,
      default: 0,
    },

    // ── Step 3: Client Reframing ───────────────────────────────────────────
    // The client's responses to the reframing prompts
    evidenceFor: {
      type: String,
      maxlength: 2000,
      default: '',
    },
    evidenceAgainst: {
      type: String,
      maxlength: 2000,
      default: '',
    },
    balancedThought: {
      type: String,
      maxlength: 2000,
      default: '',
    },

    // ── Mood Tracking ──────────────────────────────────────────────────────
    moodBefore: {
      type: Number,
      min: 1,
      max: 10,
      default: null,
    },
    moodAfter: {
      type: Number,
      min: 1,
      max: 10,
      default: null,
    },

    // ── Status ─────────────────────────────────────────────────────────────
    isCompleted: {
      type: Boolean,
      default: false,
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
CBTThoughtRecordSchema.index({ clientId: 1, createdAt: -1 });
CBTThoughtRecordSchema.index({ therapistId: 1, clientId: 1, createdAt: -1 });

module.exports = mongoose.model('CBTThoughtRecord', CBTThoughtRecordSchema);
