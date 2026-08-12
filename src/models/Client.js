/**
 * @file Client.js
 * @description Mongoose model for the Client entity.
 *
 * A Client is a patient / end-user who is linked to exactly one Therapist.
 * Clients can book sessions, purchase packages, and be tracked through the
 * full care lifecycle (lead → active → discharged).
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Sub-schema: Emergency Contact ───────────────────────────────────────────
const EmergencyContactSchema = new Schema(
  {
    name: { type: String, trim: true },       // Full name of emergency contact
    relationship: { type: String, trim: true }, // e.g. "Mother", "Spouse"
    phone: { type: String, trim: true },       // Contact phone number
  },
  { _id: false }
);

// ─── Sub-schema: Intake Information ──────────────────────────────────────────
const IntakeSchema = new Schema(
  {
    // Primary reason for seeking therapy (client-reported)
    presentingConcerns: { type: String, maxlength: 2000 },

    // Relevant medical history shared during intake
    medicalHistory: { type: String, maxlength: 2000 },

    // Current medications the client is taking
    currentMedications: [{ type: String, trim: true }],

    // Previous therapy experience (therapist names / duration / approach)
    previousTherapyHistory: { type: String, maxlength: 2000 },

    // Client-stated therapy goals
    goals: { type: String, maxlength: 2000 },

    // How the client heard about / was referred to this therapist
    referralSource: { type: String, trim: true },
  },
  { _id: false }
);

// ─── Main Schema ─────────────────────────────────────────────────────────────
const ClientSchema = new Schema(
  {
    // ── Relationship ─────────────────────────────────────────────────────────

    // The therapist who owns / manages this client record
    therapistId: {
      type: Schema.Types.ObjectId,
      ref: 'Therapist',
      required: [true, 'Therapist reference is required'],
      index: true,
    },

    // ── Identity ──────────────────────────────────────────────────────────────

    // Full legal name of the client
    name: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
    },

    // Client's email address – unique per therapist (not globally unique)
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },

    // Phone number including country code
    phone: { type: String, trim: true },

    // Date of birth for age-gating and demographic reporting
    dateOfBirth: { type: Date },

    // Client's gender identity (free-text to be inclusive)
    gender: { type: String, trim: true },

    // Profile photo URL
    avatar: { type: String, trim: true },

    // ── Client Portal ────────────────────────────────────────────────────────

    // Hashed password if the client has self-service portal access
    password: { type: String, minlength: 8, select: false },

    // Whether the client has activated their self-service portal account
    hasPortalAccess: { type: Boolean, default: false },

    // Email-verified flag for portal login
    isEmailVerified: { type: Boolean, default: false },

    // ── Care Status ──────────────────────────────────────────────────────────

    // Current stage in the client's care journey
    status: {
      type: String,
      enum: ['active', 'inactive', 'on_hold', 'discharged', 'waitlist'],
      default: 'active',
    },

    // Internal colour-coded label for quick visual identification in the CRM
    tag: {
      type: String,
      enum: ['low_risk', 'moderate_risk', 'high_risk', 'vip', 'new', 'none'],
      default: 'none',
    },

    // Date on which the client was formally onboarded / first seen
    onboardedAt: { type: Date },

    // Date on which the client was formally discharged from care
    dischargedAt: { type: Date },

    // ── Intake ────────────────────────────────────────────────────────────────
    intake: { type: IntakeSchema, default: () => ({}) },

    // ── Emergency Contact ────────────────────────────────────────────────────
    emergencyContact: { type: EmergencyContactSchema, default: () => ({}) },

    // ── Preferences ──────────────────────────────────────────────────────────

    // Preferred session medium for automatic scheduling defaults
    preferredSessionMedium: {
      type: String,
      enum: ['video', 'audio', 'in_person', 'chat'],
      default: 'video',
    },

    // Preferred language for communication
    preferredLanguage: { type: String, default: 'English', trim: true },

    // Timezone used to display session times in the client portal
    timezone: { type: String, default: 'Asia/Kolkata', trim: true },

    // ── Billing ───────────────────────────────────────────────────────────────

    // Stripe or Razorpay customer ID for recurring billing
    paymentCustomerId: { type: String, trim: true },

    // ── Internal Notes ────────────────────────────────────────────────────────

    // Quick therapist-only notes visible on the client card in the CRM
    internalNotes: { type: String, maxlength: 5000 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────

// Frequently queried: all clients of a therapist
ClientSchema.index({ therapistId: 1, email: 1 }, { unique: true }); // Prevent duplicate email per therapist
ClientSchema.index({ therapistId: 1, status: 1 });                  // Filter by care status
ClientSchema.index({ therapistId: 1, createdAt: -1 });              // Most recent clients first
ClientSchema.index({ email: 1 });                                    // Portal login lookup

// ─── Virtuals ────────────────────────────────────────────────────────────────

// Computed age from date of birth
ClientSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;
  const diff = Date.now() - this.dateOfBirth.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
});

// ─── Export ───────────────────────────────────────────────────────────────────
const Client = mongoose.model('Client', ClientSchema);
module.exports = Client;
