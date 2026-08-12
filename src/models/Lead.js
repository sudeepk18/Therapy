/**
 * @file Lead.js
 * @description Mongoose model for the Lead entity.
 *
 * A Lead represents a prospective client who has expressed interest in a
 * Therapist's services but has not yet been fully onboarded as a Client.
 *
 * Leads enter the system via:
 *   - The therapist's public booking page contact form
 *   - Manual entry by the therapist in the CRM
 *   - Import from external sources (CSV, Calendly, etc.)
 *
 * Once a lead converts (completes intake / books first session), a
 * corresponding Client document is created and the lead's status is
 * updated to 'converted'.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Sub-schema: Follow-up Activity ──────────────────────────────────────────
const FollowUpSchema = new Schema(
  {
    // Type of follow-up activity conducted
    type: {
      type: String,
      enum: ['email', 'phone_call', 'whatsapp', 'sms', 'in_person', 'other'],
    },

    // Brief notes on the outcome of the follow-up
    notes: { type: String, trim: true, maxlength: 500 },

    // Timestamp when the follow-up was conducted
    conductedAt: { type: Date },

    // Outcome of the follow-up
    outcome: {
      type: String,
      enum: ['no_response', 'interested', 'not_interested', 'converted', 'callback_requested'],
    },

    // When the next follow-up should take place
    nextFollowUpAt: { type: Date },
  },
  { _id: true, timestamps: false } // Keep _id so individual activities can be referenced
);

// ─── Main Schema ─────────────────────────────────────────────────────────────
const LeadSchema = new Schema(
  {
    // ── Relationship ─────────────────────────────────────────────────────────

    // The therapist this lead enquired about / was assigned to
    therapistId: {
      type: Schema.Types.ObjectId,
      ref: 'Therapist',
      required: [true, 'Therapist reference is required'],
      index: true,
    },

    // If the lead converted, this links to the resulting Client document
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
    },

    // ── Identity ──────────────────────────────────────────────────────────────

    // Full name of the prospective client
    name: {
      type: String,
      required: [true, 'Lead name is required'],
      trim: true,
    },

    // Email address provided during the enquiry
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },

    // Phone number (optional – may only have email)
    phone: { type: String, trim: true },

    // ── Enquiry Details ──────────────────────────────────────────────────────

    // What the lead has stated as their primary concern / goal
    enquiryMessage: { type: String, trim: true, maxlength: 2000 },

    // How they heard about this therapist
    referralSource: {
      type: String,
      enum: [
        'google',
        'instagram',
        'facebook',
        'linkedin',
        'referral',
        'booking_page',
        'therapist_website',
        'other',
      ],
      default: 'booking_page',
    },

    // Preferred session format stated in the enquiry
    preferredMedium: {
      type: String,
      enum: ['video', 'audio', 'in_person', 'chat', 'no_preference'],
      default: 'no_preference',
    },

    // ── Pipeline Status ──────────────────────────────────────────────────────

    // Current stage in the sales / intake pipeline
    status: {
      type: String,
      enum: [
        'new',            // Just submitted the enquiry form
        'contacted',      // Therapist has reached out
        'consultation_scheduled', // Intro / discovery call booked
        'in_discussion',  // Actively in communication
        'converted',      // Became a full Client
        'lost',           // Chose not to proceed
        'unresponsive',   // No response after multiple attempts
      ],
      default: 'new',
      index: true,
    },

    // Internal colour-coded priority tag
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },

    // ── Follow-up Log ────────────────────────────────────────────────────────

    // Chronological log of all follow-up activities with this lead
    followUps: [FollowUpSchema],

    // Timestamp for the next scheduled follow-up (denormalized for cron queries)
    nextFollowUpAt: { type: Date, index: true },

    // ── Assignment ───────────────────────────────────────────────────────────

    // Internal notes visible only to the therapist / admin
    internalNotes: { type: String, trim: true, maxlength: 2000 },

    // ── Conversion ───────────────────────────────────────────────────────────

    // Timestamp when the lead was converted to a client
    convertedAt: { type: Date },

    // Timestamp when the lead was marked as lost
    lostAt: { type: Date },

    // Reason the lead did not convert (for analytics / CRM improvement)
    lostReason: { type: String, trim: true, maxlength: 500 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
LeadSchema.index({ therapistId: 1, status: 1 });            // Pipeline view per therapist
LeadSchema.index({ therapistId: 1, email: 1 });             // Duplicate-lead detection
LeadSchema.index({ therapistId: 1, createdAt: -1 });        // Most recent leads first
LeadSchema.index({ email: 1 });                             // Global email lookup

// ─── Virtuals ────────────────────────────────────────────────────────────────

// Days since the lead was created (helps identify stale leads)
LeadSchema.virtual('ageDays').get(function () {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// ─── Export ───────────────────────────────────────────────────────────────────
const Lead = mongoose.model('Lead', LeadSchema);
module.exports = Lead;
