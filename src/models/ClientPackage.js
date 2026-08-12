/**
 * @file ClientPackage.js
 * @description Mongoose model for the ClientPackage entity.
 *
 * A ClientPackage is an instance of a Package that has been purchased by or
 * assigned to a specific Client. It tracks:
 *   - How many sessions have been used vs. remaining
 *   - The payment that funded the purchase
 *   - Expiry date derived from the Package's validityDays
 *
 * Relationships:
 *   - ClientPackage → Client (buyer)
 *   - ClientPackage → Package (template)
 *   - ClientPackage → Therapist (owner of the package)
 *   - Sessions → ClientPackage (deducted on booking)
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Main Schema ─────────────────────────────────────────────────────────────
const ClientPackageSchema = new Schema(
  {
    // ── Relationships ────────────────────────────────────────────────────────

    // The client who purchased or was assigned this package
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client reference is required'],
      index: true,
    },

    // The package template this instance was created from
    packageId: {
      type: Schema.Types.ObjectId,
      ref: 'Package',
      required: [true, 'Package reference is required'],
      index: true,
    },

    // The therapist who owns the package (denormalized for fast queries)
    therapistId: {
      type: Schema.Types.ObjectId,
      ref: 'Therapist',
      required: [true, 'Therapist reference is required'],
      index: true,
    },

    // The payment transaction that funded this purchase (null if gifted / manual)
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },

    // ── Snapshot of Package at Time of Purchase ───────────────────────────────
    // Stored separately so changes to the Package template don't affect history

    // Name of the package at the time of purchase
    packageName: { type: String, trim: true },

    // Price paid in the smallest currency unit
    pricePaid: { type: Number, min: 0 },

    // Currency of the transaction
    currency: { type: String, default: 'INR', uppercase: true, trim: true },

    // ── Session Credits ──────────────────────────────────────────────────────

    // Total sessions included (copied from Package.totalSessions at purchase)
    totalSessions: {
      type: Number,
      required: [true, 'Total sessions is required'],
      min: 1,
    },

    // Sessions that have already been consumed
    sessionsUsed: { type: Number, min: 0, default: 0 },

    // Sessions still available for booking (totalSessions - sessionsUsed)
    sessionsRemaining: { type: Number, min: 0 },

    // ── Status ───────────────────────────────────────────────────────────────

    // Current state of this client package instance
    status: {
      type: String,
      enum: [
        'active',    // Sessions are available and the package is within validity
        'exhausted', // All sessions have been consumed
        'expired',   // Validity period has passed with unused sessions
        'cancelled', // Manually cancelled by therapist or admin
        'pending',   // Payment is pending confirmation
      ],
      default: 'pending',
      index: true,
    },

    // ── Validity ─────────────────────────────────────────────────────────────

    // Date from which the package sessions can be used
    validFrom: {
      type: Date,
      required: [true, 'Valid-from date is required'],
      default: Date.now,
    },

    // Date after which unused sessions expire (null = no expiry)
    expiresAt: { type: Date, default: null, index: true },

    // ── How it was acquired ──────────────────────────────────────────────────

    // How the client received this package
    acquisitionType: {
      type: String,
      enum: [
        'purchased',     // Client paid via the payment gateway
        'gifted',        // Therapist manually granted sessions
        'promotional',   // Issued as part of a promotion or trial
        'transferred',   // Transferred from another package or client
      ],
      default: 'purchased',
    },

    // Optional internal note (e.g. reason for gifting / transfer)
    notes: { type: String, trim: true, maxlength: 500 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
ClientPackageSchema.index({ clientId: 1, status: 1 });              // Active packages for a client
ClientPackageSchema.index({ therapistId: 1, status: 1 });           // Revenue / utilisation reports
ClientPackageSchema.index({ expiresAt: 1, status: 1 }, { sparse: true }); // Expiry cron job

// ─── Pre-save Middleware ─────────────────────────────────────────────────────

// Keep sessionsRemaining in sync and auto-update status
ClientPackageSchema.pre('save', function (next) {
  // Recompute remaining sessions
  this.sessionsRemaining = this.totalSessions - this.sessionsUsed;

  // Auto-transition to 'exhausted' when all sessions are used
  if (this.sessionsRemaining <= 0 && this.status === 'active') {
    this.status = 'exhausted';
  }

  // Auto-transition to 'expired' if past expiry and still active
  if (this.expiresAt && this.expiresAt < new Date() && this.status === 'active') {
    this.status = 'expired';
  }

  next();
});

// ─── Virtuals ────────────────────────────────────────────────────────────────

// Whether this package can still be used to book sessions
ClientPackageSchema.virtual('isUsable').get(function () {
  return (
    this.status === 'active' &&
    this.sessionsRemaining > 0 &&
    (!this.expiresAt || this.expiresAt > new Date())
  );
});

// ─── Export ───────────────────────────────────────────────────────────────────
const ClientPackage = mongoose.model('ClientPackage', ClientPackageSchema);
module.exports = ClientPackage;
