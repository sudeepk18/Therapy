/**
 * @file Payment.js
 * @description Mongoose model for the Payment entity.
 *
 * Tracks every financial transaction in the platform.
 * Payments can be for:
 *   1. Individual sessions (pay-per-session)
 *   2. Package purchases (bulk session bundles)
 *   3. Therapist's own SaaS subscription
 *
 * The model stores both the payment gateway's reference IDs and the
 * internal reconciliation metadata required for reporting.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Sub-schema: Refund Details ───────────────────────────────────────────────
const RefundSchema = new Schema(
  {
    // Amount refunded in the smallest currency unit (paise / cents)
    amount: { type: Number, min: 0 },

    // Reason provided for the refund
    reason: {
      type: String,
      enum: [
        'therapist_cancellation',
        'client_cancellation',
        'no_show',
        'duplicate_charge',
        'service_not_rendered',
        'dispute',
        'other',
      ],
    },

    // Notes about the refund decision
    notes: { type: String, maxlength: 500 },

    // Gateway-issued refund transaction / reference ID
    gatewayRefundId: { type: String, trim: true },

    // Timestamp when the refund was initiated
    refundedAt: { type: Date },

    // Timestamp when the refund was confirmed by the gateway webhook
    confirmedAt: { type: Date },
  },
  { _id: false }
);

// ─── Main Schema ─────────────────────────────────────────────────────────────
const PaymentSchema = new Schema(
  {
    // ── Relationships ────────────────────────────────────────────────────────

    // The therapist this payment is associated with
    therapistId: {
      type: Schema.Types.ObjectId,
      ref: 'Therapist',
      required: [true, 'Therapist reference is required'],
      index: true,
    },

    // The client who made the payment (null for therapist's own subscription)
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
      index: true,
    },

    // The session this payment covers (null for package / subscription payments)
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      default: null,
      index: true,
    },

    // The package purchase this payment covers (null for session / subscription)
    clientPackageId: {
      type: Schema.Types.ObjectId,
      ref: 'ClientPackage',
      default: null,
    },

    // ── Payment Context ──────────────────────────────────────────────────────

    // What this payment is for
    paymentFor: {
      type: String,
      enum: [
        'session',       // Single session fee
        'package',       // Client buying a session bundle
        'subscription',  // Therapist's SaaS subscription renewal
        'deposit',       // Upfront deposit / retainer
      ],
      required: [true, 'Payment context is required'],
    },

    // ── Amount & Currency ────────────────────────────────────────────────────

    // Total charge in the smallest currency unit (e.g. paise for INR)
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Amount cannot be negative'],
    },

    // ISO 4217 currency code (e.g. 'INR', 'USD')
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      default: 'INR',
      uppercase: true,
      trim: true,
    },

    // Platform fee / commission deducted from the amount (if applicable)
    platformFee: { type: Number, min: 0, default: 0 },

    // Amount that will be settled to the therapist after the platform fee
    netAmount: { type: Number, min: 0 },

    // ── Status ───────────────────────────────────────────────────────────────

    // Current state of the payment transaction
    status: {
      type: String,
      enum: [
        'pending',    // Payment initiated but not yet confirmed
        'processing', // Gateway is processing the charge
        'succeeded',  // Payment confirmed and captured
        'failed',     // Payment failed (insufficient funds, etc.)
        'refunded',   // Full refund issued
        'partially_refunded', // Partial refund issued
        'disputed',   // Chargeback raised by the client
        'cancelled',  // Payment intent cancelled before capture
      ],
      default: 'pending',
      required: true,
      index: true,
    },

    // ── Gateway Details ──────────────────────────────────────────────────────

    // Payment gateway used for this transaction
    gateway: {
      type: String,
      enum: ['razorpay', 'stripe', 'paypal', 'manual', 'bank_transfer'],
      required: [true, 'Payment gateway is required'],
      default: 'razorpay',
    },

    // Gateway-issued payment / order ID (e.g. Razorpay order_xxx)
    gatewayOrderId: { type: String, trim: true },

    // Gateway-issued payment ID confirmed after capture
    gatewayPaymentId: { type: String, trim: true },

    // Cryptographic signature returned by the gateway (for verification)
    gatewaySignature: { type: String, trim: true, select: false },

    // Gateway-issued invoice / receipt ID
    gatewayReceiptId: { type: String, trim: true },

    // URL of the hosted receipt / invoice provided by the gateway
    receiptUrl: { type: String, trim: true },

    // ── Refund ───────────────────────────────────────────────────────────────
    refund: { type: RefundSchema, default: null },

    // ── Timestamps ───────────────────────────────────────────────────────────

    // When the payment was successfully captured / confirmed
    paidAt: { type: Date },

    // When the payment failed
    failedAt: { type: Date },

    // ── Metadata ─────────────────────────────────────────────────────────────

    // Human-readable description shown on invoices
    description: { type: String, trim: true, maxlength: 500 },

    // Arbitrary key-value pairs from the gateway (for debugging / reconciliation)
    gatewayMeta: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
PaymentSchema.index({ therapistId: 1, createdAt: -1 });   // Therapist revenue reports
PaymentSchema.index({ clientId: 1, createdAt: -1 });       // Client payment history
PaymentSchema.index({ status: 1, gateway: 1 });            // Reconciliation queries
PaymentSchema.index({ gatewayPaymentId: 1 }, { sparse: true }); // Webhook deduplication

// ─── Pre-save Middleware ─────────────────────────────────────────────────────

// Auto-compute netAmount = amount - platformFee
PaymentSchema.pre('save', function (next) {
  if (this.isModified('amount') || this.isModified('platformFee')) {
    this.netAmount = (this.amount || 0) - (this.platformFee || 0);
  }
  next();
});

// ─── Export ───────────────────────────────────────────────────────────────────
const Payment = mongoose.model('Payment', PaymentSchema);
module.exports = Payment;
