/**
 * @file Package.js
 * @description Mongoose model for the Package (Session Bundle) entity.
 *
 * A Package is a reusable template created by a Therapist that defines a
 * bundle of sessions offered at a fixed price. Clients can purchase a Package
 * (resulting in a ClientPackage document) and then use the sessions from that
 * bundle across multiple bookings.
 *
 * Example: "10-Session CBT Programme – ₹15,000"
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Main Schema ─────────────────────────────────────────────────────────────
const PackageSchema = new Schema(
  {
    // ── Relationship ─────────────────────────────────────────────────────────

    // The therapist who created and owns this package template
    therapistId: {
      type: Schema.Types.ObjectId,
      ref: 'Therapist',
      required: [true, 'Therapist reference is required'],
      index: true,
    },

    // ── Identity ──────────────────────────────────────────────────────────────

    // Display name of the package (shown on the booking page)
    name: {
      type: String,
      required: [true, 'Package name is required'],
      trim: true,
      maxlength: 150,
    },

    // Short description of what the package includes
    description: { type: String, trim: true, maxlength: 1000 },

    // ── Session Details ──────────────────────────────────────────────────────

    // Total number of sessions included in this package
    totalSessions: {
      type: Number,
      required: [true, 'Total sessions count is required'],
      min: [1, 'Package must include at least 1 session'],
      max: [100, 'Package cannot include more than 100 sessions'],
    },

    // Duration of each session in minutes
    sessionDurationMinutes: {
      type: Number,
      required: [true, 'Session duration is required'],
      min: [15, 'Minimum session duration is 15 minutes'],
      default: 50,
    },

    // Session format offered in this package
    sessionMedium: {
      type: String,
      enum: ['video', 'audio', 'in_person', 'chat', 'any'],
      default: 'video',
    },

    // ── Pricing ──────────────────────────────────────────────────────────────

    // Total price for the full package in the smallest currency unit
    price: {
      type: Number,
      required: [true, 'Package price is required'],
      min: [0, 'Price cannot be negative'],
    },

    // ISO 4217 currency code
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
    },

    // Original / strike-through price for displaying discounts (optional)
    originalPrice: { type: Number, min: 0 },

    // Effective price per session (denormalized for display)
    pricePerSession: { type: Number, min: 0 },

    // ── Validity ─────────────────────────────────────────────────────────────

    // Number of days after purchase within which all sessions must be used
    // null means sessions never expire
    validityDays: { type: Number, min: 1, default: null },

    // ── Availability ─────────────────────────────────────────────────────────

    // Whether this package is currently visible and purchasable by clients
    isActive: { type: Boolean, default: true },

    // Whether the package is shown on the public booking page
    isPublic: { type: Boolean, default: true },

    // Maximum number of times this package can be sold (null = unlimited)
    maxPurchases: { type: Number, min: 1, default: null },

    // Running count of times this package has been purchased
    purchaseCount: { type: Number, min: 0, default: 0 },

    // ── Display ───────────────────────────────────────────────────────────────

    // Highlight tag shown on the booking page (e.g. "Most Popular", "Best Value")
    badge: { type: String, trim: true, maxlength: 50 },

    // Ordered list of feature bullet points for the booking page card
    features: [{ type: String, trim: true }],

    // Sort order for display on the booking page (lower = shown first)
    displayOrder: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
PackageSchema.index({ therapistId: 1, isActive: 1 });   // Active packages per therapist
PackageSchema.index({ therapistId: 1, isPublic: 1 });   // Public booking page packages

// ─── Pre-save Middleware ─────────────────────────────────────────────────────

// Auto-compute pricePerSession whenever price or totalSessions changes
PackageSchema.pre('save', function (next) {
  if ((this.isModified('price') || this.isModified('totalSessions')) && this.totalSessions > 0) {
    this.pricePerSession = Math.round(this.price / this.totalSessions);
  }
  next();
});

// ─── Export ───────────────────────────────────────────────────────────────────
const Package = mongoose.model('Package', PackageSchema);
module.exports = Package;
