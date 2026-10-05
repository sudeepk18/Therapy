/**
 * @file Notification.js
 * @description Mongoose model for Therapist notifications & session reminders.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const NotificationSchema = new Schema(
  {
    therapistId: {
      type: Schema.Types.ObjectId,
      ref: 'Therapist',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['session_reminder', 'booking_request', 'payment', 'system'],
      default: 'session_reminder',
      index: true,
    },
    subType: {
      type: String,
      enum: ['day_of', 'one_hour', 'five_minutes', 'general'],
      default: 'general',
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      default: null,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    sessionTime: {
      type: Date,
      default: null,
    },
    sessionMedium: {
      type: String,
      enum: ['video', 'audio', 'in_person', 'chat', null],
      default: null,
    },
    clientName: {
      type: String,
      default: '',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ therapistId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
