/**
 * @file SubscriptionTierConfig.js
 * @description Mongoose model for Subscription Tier Configuration.
 *
 * This collection acts as the single source of truth for what each
 * subscription tier (free, starter, pro, enterprise) includes.
 *
 * Responsibilities:
 *   1. Hard limits  – numeric caps (max clients, sessions per month, etc.)
 *   2. Feature flags – boolean toggles (video calling, custom branding, etc.)
 *   3. Pricing info  – displayed on the marketing / pricing page
 *
 * In practice there will be one document per tier (4 total). These are
 * seeded during deployment and updated via an admin panel — not created
 * by end-users. Therapists' subscriptionTier field is compared against
 * these documents at runtime to enforce limits.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Sub-schema: Hard Limits ─────────────────────────────────────────────────
const LimitsSchema = new Schema(
  {
    // Maximum number of active clients allowed (-1 = unlimited)
    maxClients: { type: Number, required: true, default: 5 },

    // Maximum sessions that can be conducted per calendar month (-1 = unlimited)
    maxSessionsPerMonth: { type: Number, required: true, default: 20 },

    // Maximum number of active packages the therapist can publish (-1 = unlimited)
    maxPackages: { type: Number, required: true, default: 0 },

    // Maximum concurrent video-call rooms (-1 = unlimited, 0 = no video)
    maxConcurrentRooms: { type: Number, required: true, default: 1 },

    // Maximum number of team members / associates that can be added (-1 = unlimited)
    maxTeamMembers: { type: Number, required: true, default: 0 },

    // Maximum storage for session recordings in GB (0 = no recording)
    storageGb: { type: Number, required: true, default: 0 },

    // Maximum number of leads in the CRM pipeline (-1 = unlimited)
    maxLeads: { type: Number, required: true, default: 25 },

    // Retention period for session notes and records in days (-1 = forever)
    dataRetentionDays: { type: Number, required: true, default: 365 },
  },
  { _id: false }
);

// ─── Sub-schema: Feature Flags ────────────────────────────────────────────────
const FeaturesSchema = new Schema(
  {
    // ── Core ─────────────────────────────────────────────────────────────────

    // Integrated video / audio calling via the platform
    videoCall: { type: Boolean, default: false },

    // AI-assisted session note drafting
    aiNoteSuggestions: { type: Boolean, default: false },

    // Electronic session note signing with tamper-evident hash
    digitalSignature: { type: Boolean, default: false },

    // ── Booking & Scheduling ─────────────────────────────────────────────────

    // Shareable public booking page (the therapist's branded URL)
    publicBookingPage: { type: Boolean, default: true },

    // Automated SMS / WhatsApp / email reminders sent to clients
    automatedReminders: { type: Boolean, default: false },

    // Recurring / repeat session booking (e.g. every Monday at 10am)
    recurringBookings: { type: Boolean, default: false },

    // Google Calendar / Outlook two-way sync
    calendarSync: { type: Boolean, default: false },

    // ── Client Management ─────────────────────────────────────────────────────

    // Self-service client portal (clients can log in, see notes, pay, book)
    clientPortal: { type: Boolean, default: false },

    // In-platform secure messaging between therapist and client
    secureMessaging: { type: Boolean, default: false },

    // Structured intake / assessment form builder
    intakeForms: { type: Boolean, default: false },

    // ── Packages & Billing ────────────────────────────────────────────────────

    // Session bundle / package feature
    sessionPackages: { type: Boolean, default: false },

    // Automated payment collection via the platform
    onlinePayments: { type: Boolean, default: false },

    // Automated invoice / receipt generation and sending
    automatedInvoicing: { type: Boolean, default: false },

    // ── Reporting & Analytics ─────────────────────────────────────────────────

    // Basic practice analytics (session counts, revenue summary)
    basicAnalytics: { type: Boolean, default: true },

    // Advanced reporting (retention rates, outcome tracking, export)
    advancedAnalytics: { type: Boolean, default: false },

    // ── Branding ─────────────────────────────────────────────────────────────

    // Ability to set a custom brand colour and logo on the booking page
    customBranding: { type: Boolean, default: false },

    // Remove "Powered by Unfazed" from client-facing pages
    whiteLabel: { type: Boolean, default: false },

    // Custom domain mapping (e.g. booking.drpriya.com)
    customDomain: { type: Boolean, default: false },

    // ── Support ───────────────────────────────────────────────────────────────

    // Priority email support SLA
    prioritySupport: { type: Boolean, default: false },

    // Dedicated account manager
    dedicatedAccountManager: { type: Boolean, default: false },

    // HIPAA / DPDP compliance documentation provided
    complianceDocs: { type: Boolean, default: false },
  },
  { _id: false }
);

// ─── Sub-schema: Pricing ──────────────────────────────────────────────────────
const PricingSchema = new Schema(
  {
    // Monthly price in the smallest currency unit (0 = free)
    monthlyPrice: { type: Number, required: true, min: 0 },

    // Annual price in the smallest currency unit (often discounted)
    annualPrice: { type: Number, required: true, min: 0 },

    // ISO 4217 currency code for these prices
    currency: { type: String, default: 'INR', uppercase: true },

    // Short tag line shown on the pricing page (e.g. "Great for solo practitioners")
    tagLine: { type: String, trim: true },

    // Whether this tier is highlighted on the pricing page as the recommended option
    isHighlighted: { type: Boolean, default: false },

    // Stripe / Razorpay price ID for monthly billing
    gatewayMonthlyPriceId: { type: String, trim: true },

    // Stripe / Razorpay price ID for annual billing
    gatewayAnnualPriceId: { type: String, trim: true },
  },
  { _id: false }
);

// ─── Main Schema ─────────────────────────────────────────────────────────────
const SubscriptionTierConfigSchema = new Schema(
  {
    // ── Tier Identifier ──────────────────────────────────────────────────────

    // The unique machine-readable name for this tier
    tier: {
      type: String,
      enum: ['free', 'starter', 'pro', 'enterprise'],
      required: [true, 'Tier name is required'],
      unique: true,
    },

    // Human-readable display name (e.g. "Starter", "Pro Plus")
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
    },

    // One-sentence description shown on the pricing page
    description: { type: String, trim: true, maxlength: 300 },

    // ── Limits & Features ────────────────────────────────────────────────────
    limits: { type: LimitsSchema, required: true, default: () => ({}) },
    features: { type: FeaturesSchema, required: true, default: () => ({}) },

    // ── Pricing ───────────────────────────────────────────────────────────────
    pricing: { type: PricingSchema, required: true },

    // ── Admin Control ─────────────────────────────────────────────────────────

    // Sort order for display on the pricing page (lower = shown first)
    displayOrder: { type: Number, default: 0 },

    // Whether this tier is currently available for new subscriptions
    isAvailable: { type: Boolean, default: true },

    // Internal version tag to track config schema changes
    configVersion: { type: String, default: '1.0.0', trim: true },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
SubscriptionTierConfigSchema.index({ isAvailable: 1, displayOrder: 1 }); // Pricing page sort

// ─── Export ───────────────────────────────────────────────────────────────────
const SubscriptionTierConfig = mongoose.model('SubscriptionTierConfig', SubscriptionTierConfigSchema);
module.exports = SubscriptionTierConfig;
