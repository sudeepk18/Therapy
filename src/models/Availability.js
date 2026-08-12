/**
 * @file Availability.js
 * @description Mongoose model for Therapist Availability.
 *
 * Stores each therapist's recurring weekly schedule and one-off date overrides
 * (blocked dates, special hours). The booking engine uses this collection to
 * compute available time slots for a given therapist.
 *
 * Design:
 *   - A single document per therapist per day-of-week (recurring slots).
 *   - Separate documents for date-specific overrides (isOverride: true).
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Sub-schema: Time Slot ────────────────────────────────────────────────────
const TimeSlotSchema = new Schema(
  {
    // Start time in 24-hour "HH:MM" format (e.g. "09:00")
    startTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'startTime must be in HH:MM format'],
    },

    // End time in 24-hour "HH:MM" format (e.g. "17:00")
    endTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'endTime must be in HH:MM format'],
    },

    // Whether this specific time slot is currently accepting bookings
    isAvailable: { type: Boolean, default: true },
  },
  { _id: false }
);

// ─── Main Schema ─────────────────────────────────────────────────────────────
const AvailabilitySchema = new Schema(
  {
    // ── Relationship ─────────────────────────────────────────────────────────

    // The therapist whose schedule this document describes
    therapistId: {
      type: Schema.Types.ObjectId,
      ref: 'Therapist',
      required: [true, 'Therapist reference is required'],
      index: true,
    },

    // ── Schedule Type ────────────────────────────────────────────────────────

    // Whether this is a recurring weekly rule or a one-off date override
    isOverride: { type: Boolean, default: false },

    // ── Recurring Rule Fields (used when isOverride === false) ────────────────

    // Day of the week: 0 = Sunday, 1 = Monday, … 6 = Saturday
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6,
      // Required only for recurring rules; nullable for overrides
    },

    // ── Date Override Fields (used when isOverride === true) ──────────────────

    // The specific calendar date this override applies to (YYYY-MM-DD)
    overrideDate: { type: Date },

    // Human-readable label for the override (e.g. "National Holiday")
    overrideLabel: { type: String, trim: true },

    // ── Availability State ───────────────────────────────────────────────────

    // Whether the therapist is available at all on this day / date
    // Setting to false blocks the entire day regardless of time slots
    isDayAvailable: { type: Boolean, default: true },

    // Array of available time windows within the day
    slots: {
      type: [TimeSlotSchema],
      default: [],
      validate: {
        validator: function (slots) {
          // Ensure no overlapping slots
          for (let i = 0; i < slots.length; i++) {
            for (let j = i + 1; j < slots.length; j++) {
              if (slots[i].startTime < slots[j].endTime && slots[i].endTime > slots[j].startTime) {
                return false;
              }
            }
          }
          return true;
        },
        message: 'Time slots must not overlap',
      },
    },

    // ── Buffer Settings ──────────────────────────────────────────────────────

    // Gap in minutes between consecutive bookings (prep / travel time)
    bufferBetweenSessionsMinutes: { type: Number, min: 0, default: 15 },

    // ── Timezone ─────────────────────────────────────────────────────────────

    // IANA timezone identifier for this therapist's working hours
    // All times in this document are interpreted in this timezone
    timezone: { type: String, default: 'Asia/Kolkata', trim: true },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
AvailabilitySchema.index({ therapistId: 1, dayOfWeek: 1 });            // Recurring schedule lookup
AvailabilitySchema.index({ therapistId: 1, isOverride: 1, overrideDate: 1 }); // Override lookup

// ─── Validation: dayOfWeek XOR overrideDate ───────────────────────────────────
AvailabilitySchema.pre('save', function (next) {
  if (!this.isOverride && this.dayOfWeek === undefined) {
    return next(new Error('dayOfWeek is required for recurring availability rules'));
  }
  if (this.isOverride && !this.overrideDate) {
    return next(new Error('overrideDate is required for override availability documents'));
  }
  next();
});

// ─── Export ───────────────────────────────────────────────────────────────────
const Availability = mongoose.model('Availability', AvailabilitySchema);
module.exports = Availability;
