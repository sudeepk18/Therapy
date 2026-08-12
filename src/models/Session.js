/**
 * @file Session.js
 * @description Mongoose model for the Session entity.
 *
 * A Session represents a single therapy appointment between a Therapist and a
 * Client. It tracks the full lifecycle from scheduling → confirmation →
 * completion / cancellation, and stores the video-call metadata.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Sub-schema: Video Call Metadata ─────────────────────────────────────────
const VideoCallSchema = new Schema(
  {
    // Provider used for this session (e.g. 'daily', 'zoom', 'google_meet')
    provider: {
      type: String,
      enum: ['daily', 'zoom', 'google_meet', 'jitsi', 'other'],
      default: 'daily',
    },

    // Unique room name or meeting ID on the provider's platform
    roomName: { type: String, trim: true },

    // Full join URL sent to both therapist and client
    joinUrl: { type: String, trim: true },

    // Host-specific URL / token (therapist only; kept select:false in projection)
    hostUrl: { type: String, trim: true },

    // ISO timestamp when the actual call was started
    startedAt: { type: Date },

    // ISO timestamp when the call ended (populated post-session)
    endedAt: { type: Date },

    // Duration in minutes as reported by the provider webhook
    actualDurationMinutes: { type: Number, min: 0 },

    // Cloud recording URL (if recording was enabled)
    recordingUrl: { type: String, trim: true },
  },
  { _id: false }
);

// ─── Sub-schema: Cancellation Details ────────────────────────────────────────
const CancellationSchema = new Schema(
  {
    // Who initiated the cancellation
    cancelledBy: {
      type: String,
      enum: ['therapist', 'client', 'system', 'admin'],
    },

    // Reason code for analytics and policies
    reason: {
      type: String,
      enum: [
        'client_no_show',
        'client_request',
        'therapist_request',
        'emergency',
        'rescheduled',
        'payment_failed',
        'other',
      ],
    },

    // Free-text additional note about the cancellation
    notes: { type: String, maxlength: 500 },

    // Timestamp of the cancellation action
    cancelledAt: { type: Date },

    // Whether the cancellation fee was waived by the therapist
    feeWaived: { type: Boolean, default: false },
  },
  { _id: false }
);

// ─── Main Schema ─────────────────────────────────────────────────────────────
const SessionSchema = new Schema(
  {
    // ── Relationships ────────────────────────────────────────────────────────

    // The therapist conducting the session
    therapistId: {
      type: Schema.Types.ObjectId,
      ref: 'Therapist',
      required: [true, 'Therapist reference is required'],
      index: true,
    },

    // The client attending the session
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client reference is required'],
      index: true,
    },

    // Optional: session was deducted from this client-package (null = pay-per-session)
    clientPackageId: {
      type: Schema.Types.ObjectId,
      ref: 'ClientPackage',
      default: null,
    },

    // ── Scheduling ───────────────────────────────────────────────────────────

    // Scheduled start date and time (stored in UTC)
    scheduledAt: {
      type: Date,
      required: [true, 'Session scheduled time is required'],
    },

    // Duration of the session in minutes (e.g. 50, 60, 90)
    durationMinutes: {
      type: Number,
      required: [true, 'Session duration is required'],
      min: [15, 'Minimum session duration is 15 minutes'],
      max: [240, 'Maximum session duration is 240 minutes'],
      default: 50,
    },

    // Computed end time = scheduledAt + durationMinutes (denormalized for queries)
    scheduledEndAt: { type: Date },

    // ── Session Type ─────────────────────────────────────────────────────────

    // Format in which the session takes place
    medium: {
      type: String,
      enum: ['video', 'audio', 'in_person', 'chat'],
      default: 'video',
    },

    // Category of therapy conducted in this session
    sessionType: {
      type: String,
      enum: [
        'individual',   // One-on-one therapy
        'couples',      // Relationship / couples therapy
        'family',       // Family systems therapy
        'group',        // Group therapy session
        'consultation', // Intake or assessment consultation
        'follow_up',    // Brief follow-up check-in
      ],
      default: 'individual',
    },

    // Session number in the therapist-client relationship (1-based)
    sessionNumber: { type: Number, min: 1 },

    // ── Status ───────────────────────────────────────────────────────────────

    // Current lifecycle state of the session
    status: {
      type: String,
      enum: [
        'scheduled',    // Confirmed future appointment
        'in_progress',  // Active live call
        'completed',    // Session finished successfully
        'cancelled',    // Cancelled before start
        'no_show',      // Client did not attend
        'rescheduled',  // Replaced by a new session
      ],
      default: 'scheduled',
      index: true,
    },

    // ── Confirmation ─────────────────────────────────────────────────────────

    // Whether the client has confirmed attendance
    isClientConfirmed: { type: Boolean, default: false },

    // Timestamp when the client confirmed
    clientConfirmedAt: { type: Date },

    // ── Video Call ────────────────────────────────────────────────────────────
    videoCall: { type: VideoCallSchema, default: () => ({}) },

    // ── Cancellation ─────────────────────────────────────────────────────────
    cancellation: { type: CancellationSchema, default: null },

    // ── Billing ───────────────────────────────────────────────────────────────

    // Fee charged for this session in the smallest currency unit (paise / cents)
    feeAmount: { type: Number, min: 0, default: 0 },

    // ISO 4217 currency code (e.g. 'INR', 'USD')
    currency: { type: String, default: 'INR', uppercase: true, trim: true },

    // Whether this session was covered by a package (no individual payment needed)
    isPaidViaPackage: { type: Boolean, default: false },

    // ── Reminders ────────────────────────────────────────────────────────────

    // Timestamps of reminder notifications sent to therapist and client
    reminderSentAt: [{ type: Date }],

    // ── Internal ─────────────────────────────────────────────────────────────

    // Free-text pre-session notes visible only to the therapist
    preSessionNotes: { type: String, maxlength: 1000 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
SessionSchema.index({ therapistId: 1, scheduledAt: -1 });           // Therapist's schedule view
SessionSchema.index({ clientId: 1, scheduledAt: -1 });              // Client's session history
SessionSchema.index({ therapistId: 1, status: 1 });                 // Filter by status per therapist
SessionSchema.index({ scheduledAt: 1, status: 1 });                 // Global upcoming-sessions cron job
SessionSchema.index({ therapistId: 1, scheduledAt: 1, scheduledEndAt: 1 }); // Overlap detection

// ─── Pre-save Middleware ─────────────────────────────────────────────────────

// Auto-compute scheduledEndAt from scheduledAt + durationMinutes
SessionSchema.pre('save', function (next) {
  if (this.scheduledAt && this.durationMinutes) {
    this.scheduledEndAt = new Date(
      this.scheduledAt.getTime() + this.durationMinutes * 60 * 1000
    );
  }
  next();
});

// ─── Virtuals ────────────────────────────────────────────────────────────────

// True if the session is in the future and still scheduled
SessionSchema.virtual('isUpcoming').get(function () {
  return this.status === 'scheduled' && this.scheduledAt > new Date();
});

// ─── Export ───────────────────────────────────────────────────────────────────
const Session = mongoose.model('Session', SessionSchema);
module.exports = Session;
