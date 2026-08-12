/**
 * @file Therapist.js
 * @description Mongoose model for the Therapist entity.
 *
 * The Therapist is the core SaaS tenant. Each therapist has their own
 * branded workspace (identified by a unique slug), manages their own
 * clients, sessions, availability, and subscription tier.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Sub-schema: Social Links ────────────────────────────────────────────────
const SocialLinksSchema = new Schema(
  {
    website: { type: String, trim: true },   // Personal / practice website URL
    linkedin: { type: String, trim: true },  // LinkedIn profile URL
    instagram: { type: String, trim: true }, // Instagram profile URL
    twitter: { type: String, trim: true },   // Twitter / X profile URL
  },
  { _id: false } // No separate _id for embedded sub-documents
);

// ─── Sub-schema: Professional Details ────────────────────────────────────────
const ProfessionalDetailsSchema = new Schema(
  {
    // License / credential number issued by the regulatory board
    licenseNumber: { type: String, trim: true },

    // Years of active clinical practice
    yearsOfExperience: { type: Number, min: 0 },

    // Primary therapeutic modalities (e.g. CBT, DBT, EMDR)
    specializations: [{ type: String, trim: true }],

    // Languages the therapist can conduct sessions in
    languages: [{ type: String, trim: true, default: 'English' }],

    // Short bio / "About me" shown on the booking page
    bio: { type: String, maxlength: 2000 },

    // Educational qualifications (e.g. PhD Psychology, LCSW)
    qualifications: [{ type: String, trim: true }],
  },
  { _id: false }
);

// ─── Sub-schema: Bank / Payout Details ───────────────────────────────────────
const PayoutDetailsSchema = new Schema(
  {
    // Name of the account holder as registered with the bank
    accountHolderName: { type: String, trim: true },

    // Bank account number (store encrypted in production)
    accountNumber: { type: String, trim: true },

    // IFSC code for Indian bank transfers
    ifscCode: { type: String, trim: true, uppercase: true },

    // UPI VPA for instant payouts (e.g. therapist@upi)
    upiId: { type: String, trim: true },
  },
  { _id: false }
);

// ─── Main Schema ─────────────────────────────────────────────────────────────
const TherapistSchema = new Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────────

    // Full display name
    name: {
      type: String,
      required: [true, 'Therapist name is required'],
      trim: true,
    },

    // Login email – must be unique across all therapists
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },

    // Hashed password (bcrypt) – never returned in API responses
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false, // Excluded from query results by default
    },

    // Profile photo URL (cloud storage path)
    avatar: { type: String, trim: true },

    // Phone number including country code (e.g. +91-9876543210)
    phone: { type: String, trim: true },

    // ── Workspace / Branding ─────────────────────────────────────────────────

    // URL-safe unique workspace identifier used in booking links
    // e.g. app.unfazed.com/dr-priya
    slug: {
      type: String,
      required: [true, 'Workspace slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
    },

    // Practice / clinic display name shown on the booking page
    practiceName: { type: String, trim: true },

    // Hex colour used to theme the therapist's booking page
    brandColor: {
      type: String,
      default: '#6C63FF',
      match: [/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a valid hex colour'],
    },

    // ── Professional Info ────────────────────────────────────────────────────
    professionalDetails: { type: ProfessionalDetailsSchema, default: () => ({}) },

    // ── Subscription ─────────────────────────────────────────────────────────

    // Active subscription tier – maps to SubscriptionTierConfig.tier
    subscriptionTier: {
      type: String,
      enum: ['free', 'starter', 'pro', 'enterprise'],
      default: 'free',
    },

    // Stripe / Razorpay subscription ID for billing management
    subscriptionId: { type: String, trim: true },

    // Date when the current subscription period ends / renews
    subscriptionExpiresAt: { type: Date },

    // ── Payout ───────────────────────────────────────────────────────────────
    payoutDetails: { type: PayoutDetailsSchema, default: () => ({}) },

    // ── Social Links ─────────────────────────────────────────────────────────
    socialLinks: { type: SocialLinksSchema, default: () => ({}) },

    // ── Flags ────────────────────────────────────────────────────────────────

    // Whether the therapist's account has been verified by the admin
    isVerified: { type: Boolean, default: false },

    // Whether the account is active (can log in and accept bookings)
    isActive: { type: Boolean, default: true },

    // Whether the public booking page is visible to new clients
    isBookingOpen: { type: Boolean, default: true },

    // Email-verified flag set after OTP / magic-link confirmation
    isEmailVerified: { type: Boolean, default: false },

    // Token for email verification (short-lived, hashed)
    emailVerificationToken: { type: String, select: false },

    // Expiry for the email verification token
    emailVerificationExpires: { type: Date, select: false },

    // Token used for password-reset flow (hashed)
    passwordResetToken: { type: String, select: false },

    // Expiry for the password-reset token
    passwordResetExpires: { type: Date, select: false },

    // Timestamp of the last successful login
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
TherapistSchema.index({ subscriptionTier: 1 }); // Admin / analytics queries
TherapistSchema.index({ isActive: 1, isBookingOpen: 1 }); // Discovery queries

// ─── Virtuals ────────────────────────────────────────────────────────────────

// Public booking URL for the therapist's workspace
TherapistSchema.virtual('bookingUrl').get(function () {
  return `https://app.unfazed.com/${this.slug}`;
});

// ─── Export ───────────────────────────────────────────────────────────────────
const Therapist = mongoose.model('Therapist', TherapistSchema);
module.exports = Therapist;
