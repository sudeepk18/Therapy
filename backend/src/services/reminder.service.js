/**
 * @file reminder.service.js
 * @description Automated multi-stage reminder scheduler for upcoming therapist sessions.
 * Sends reminders:
 *   1. On the day of the session (morning / day-of alert)
 *   2. 1 hour before the session (preparation reminder)
 *   3. 5 minutes before the session (urgent alert with join / note link)
 */

const { Session, Notification } = require('../models');

/**
 * Format a Date object into a readable time string, e.g. "11:30 AM"
 */
function formatTime(date) {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Checks upcoming sessions and dispatches notifications for each reminder milestone.
 */
async function checkAndSendReminders() {
  const now = new Date();

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // 1. Day-of Reminder
    // Sessions scheduled today (between now and end of today) where dayOf reminder hasn't been sent.
    // ──────────────────────────────────────────────────────────────────────────
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const dayOfSessions = await Session.find({
      status: { $in: ['scheduled', 'in_progress'] },
      scheduledAt: { $gte: now, $lte: endOfDay },
      $or: [
        { 'remindersSent.dayOf': null },
        { 'remindersSent.dayOf': { $exists: false } },
      ],
    }).populate('clientId', 'name email phone');

    for (const session of dayOfSessions) {
      const clientName = session.clientId?.name || 'Client';
      const timeStr = formatTime(session.scheduledAt);
      const therapistId = session.therapistId;

      await Notification.create({
        therapistId,
        type: 'session_reminder',
        subType: 'day_of',
        sessionId: session._id,
        clientId: session.clientId?._id || null,
        clientName,
        sessionTime: session.scheduledAt,
        sessionMedium: session.medium || 'video',
        title: `Upcoming Session Today: ${clientName}`,
        message: `You have a scheduled ${session.medium || 'video'} session with ${clientName} today at ${timeStr}.`,
      });

      session.remindersSent = session.remindersSent || {};
      session.remindersSent.dayOf = now;
      session.reminderSentAt = session.reminderSentAt || [];
      session.reminderSentAt.push(now);
      await session.save();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. 1-Hour Reminder
    // Sessions scheduled 50 to 70 minutes from now where oneHour reminder hasn't been sent.
    // ──────────────────────────────────────────────────────────────────────────
    const in50m = new Date(now.getTime() + 50 * 60 * 1000);
    const in70m = new Date(now.getTime() + 70 * 60 * 1000);

    const oneHourSessions = await Session.find({
      status: 'scheduled',
      scheduledAt: { $gte: in50m, $lte: in70m },
      $or: [
        { 'remindersSent.oneHour': null },
        { 'remindersSent.oneHour': { $exists: false } },
      ],
    }).populate('clientId', 'name email phone');

    for (const session of oneHourSessions) {
      const clientName = session.clientId?.name || 'Client';
      const timeStr = formatTime(session.scheduledAt);
      const therapistId = session.therapistId;

      await Notification.create({
        therapistId,
        type: 'session_reminder',
        subType: 'one_hour',
        sessionId: session._id,
        clientId: session.clientId?._id || null,
        clientName,
        sessionTime: session.scheduledAt,
        sessionMedium: session.medium || 'video',
        title: `Session in 1 Hour: ${clientName}`,
        message: `Your ${session.medium || 'video'} session with ${clientName} starts in 1 hour at ${timeStr}. Prepare notes and workspace.`,
      });

      session.remindersSent = session.remindersSent || {};
      session.remindersSent.oneHour = now;
      session.reminderSentAt = session.reminderSentAt || [];
      session.reminderSentAt.push(now);
      await session.save();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. 5-Minutes Reminder
    // Sessions scheduled 2 to 8 minutes from now where fiveMinutes reminder hasn't been sent.
    // ──────────────────────────────────────────────────────────────────────────
    const in2m = new Date(now.getTime() + 2 * 60 * 1000);
    const in8m = new Date(now.getTime() + 8 * 60 * 1000);

    const fiveMinuteSessions = await Session.find({
      status: { $in: ['scheduled', 'in_progress'] },
      scheduledAt: { $gte: in2m, $lte: in8m },
      $or: [
        { 'remindersSent.fiveMinutes': null },
        { 'remindersSent.fiveMinutes': { $exists: false } },
      ],
    }).populate('clientId', 'name email phone');

    for (const session of fiveMinuteSessions) {
      const clientName = session.clientId?.name || 'Client';
      const timeStr = formatTime(session.scheduledAt);
      const therapistId = session.therapistId;

      await Notification.create({
        therapistId,
        type: 'session_reminder',
        subType: 'five_minutes',
        sessionId: session._id,
        clientId: session.clientId?._id || null,
        clientName,
        sessionTime: session.scheduledAt,
        sessionMedium: session.medium || 'video',
        title: `Starting Soon: Session with ${clientName} in 5 Minutes!`,
        message: `Your session starts at ${timeStr}. Click here to join your session or review clinical notes.`,
      });

      session.remindersSent = session.remindersSent || {};
      session.remindersSent.fiveMinutes = now;
      session.reminderSentAt = session.reminderSentAt || [];
      session.reminderSentAt.push(now);
      await session.save();
    }
  } catch (err) {
    console.error('[ReminderScheduler Error]:', err.message);
  }
}

/**
 * Starts the reminder background scheduler loop (runs every 60 seconds).
 */
function startReminderScheduler() {
  // Run once immediately on server boot
  checkAndSendReminders();

  // Run every 60 seconds
  const intervalId = setInterval(checkAndSendReminders, 60 * 1000);

  console.log('⏰ Automated Session Reminder Scheduler active (checks every 60s: day-of, 1h, 5m)');
  return intervalId;
}

module.exports = {
  checkAndSendReminders,
  startReminderScheduler,
};
