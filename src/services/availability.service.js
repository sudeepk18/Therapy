/**
 * @file availability.service.js
 * @description Service for managing therapist working hours, date overrides, and computing free booking slots.
 */

const ApiError = require('../utils/ApiError');
const { Availability, Therapist, Session } = require('../models');

/**
 * Set or update recurring weekly working hours for a therapist
 * @param {string} therapistId 
 * @param {Array} weeklySchedule - Array of { dayOfWeek: 0-6, isDayAvailable: boolean, slots: [{ startTime, endTime }] }
 */
const setWeeklyAvailability = async (therapistId, weeklySchedule) => {
  const updatedRules = [];

  for (const dayData of weeklySchedule) {
    const { dayOfWeek, isDayAvailable, slots, bufferBetweenSessionsMinutes, timezone } = dayData;

    const rule = await Availability.findOneAndUpdate(
      { therapistId, isOverride: false, dayOfWeek },
      {
        therapistId,
        isOverride: false,
        dayOfWeek,
        isDayAvailable: isDayAvailable !== undefined ? isDayAvailable : true,
        slots: slots || [],
        bufferBetweenSessionsMinutes: bufferBetweenSessionsMinutes || 15,
        timezone: timezone || 'Asia/Kolkata',
      },
      { upsert: true, new: true, runValidators: true }
    );
    updatedRules.push(rule);
  }

  return updatedRules;
};

/**
 * Get therapist's weekly recurring availability rules
 */
const getWeeklyAvailability = async (therapistId) => {
  const rules = await Availability.find({ therapistId, isOverride: false }).sort({ dayOfWeek: 1 });
  return rules;
};

/**
 * Set or update a date-specific override (e.g. day off or custom hours)
 */
const setOverride = async (therapistId, overrideData) => {
  const { overrideDate, isDayAvailable, slots, overrideLabel, timezone } = overrideData;

  const dateObj = new Date(overrideDate);
  dateObj.setUTCHours(0, 0, 0, 0);

  const override = await Availability.findOneAndUpdate(
    { therapistId, isOverride: true, overrideDate: dateObj },
    {
      therapistId,
      isOverride: true,
      overrideDate: dateObj,
      isDayAvailable: isDayAvailable !== undefined ? isDayAvailable : true,
      slots: slots || [],
      overrideLabel: overrideLabel || 'Custom Date Override',
      timezone: timezone || 'Asia/Kolkata',
    },
    { upsert: true, new: true, runValidators: true }
  );

  return override;
};

/**
 * Delete a date override
 */
const deleteOverride = async (therapistId, overrideId) => {
  const result = await Availability.findOneAndDelete({ _id: overrideId, therapistId, isOverride: true });
  if (!result) {
    throw new ApiError(404, 'Date override not found.');
  }
  return true;
};

/**
 * CORE SCHEDULING ALGORITHM: Calculate available free time slots for a given date
 * @param {string} therapistId 
 * @param {string} dateStr - YYYY-MM-DD
 * @param {number} sessionDurationMinutes - e.g. 50
 */
const getAvailableSlots = async (therapistId, dateStr, sessionDurationMinutes = 50) => {
  const therapist = await Therapist.findById(therapistId);
  if (!therapist || !therapist.isActive || !therapist.isBookingOpen) {
    return [];
  }

  const targetDate = new Date(dateStr);
  if (isNaN(targetDate.getTime())) {
    throw new ApiError(400, 'Invalid date format. Use YYYY-MM-DD.');
  }

  targetDate.setUTCHours(0, 0, 0, 0);
  const dayOfWeek = targetDate.getUTCDay();

  // 1. Check for specific date override first
  let schedule = await Availability.findOne({
    therapistId,
    isOverride: true,
    overrideDate: targetDate,
  });

  // 2. Fall back to recurring day-of-week rule if no override exists
  if (!schedule) {
    schedule = await Availability.findOne({
      therapistId,
      isOverride: false,
      dayOfWeek,
    });
  }

  // If therapist is not available on this day or no slots defined
  if (!schedule || !schedule.isDayAvailable || !schedule.slots || schedule.slots.length === 0) {
    return [];
  }

  // 3. Query existing booked sessions for that day
  const startOfDay = new Date(targetDate);
  const endOfDay = new Date(targetDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const existingSessions = await Session.find({
    therapistId,
    status: { $in: ['scheduled', 'in_progress'] },
    scheduledAt: { $gte: startOfDay, $lte: endOfDay },
  }).select('scheduledAt scheduledEndAt durationMinutes');

  const bufferMinutes = schedule.bufferBetweenSessionsMinutes || 15;
  const availableSlots = [];

  // Helper to parse "HH:MM" into minutes from midnight
  const parseMinutes = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Helper to format minutes from midnight back to "HH:MM"
  const formatTime = (minutes) => {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  // 4. Generate candidate time slots for each available working window
  for (const window of schedule.slots) {
    if (!window.isAvailable) continue;

    const windowStart = parseMinutes(window.startTime);
    const windowEnd = parseMinutes(window.endTime);

    let slotStart = windowStart;

    while (slotStart + sessionDurationMinutes <= windowEnd) {
      const slotEnd = slotStart + sessionDurationMinutes;

      // Convert slotStart to UTC Date object for overlap check against existing sessions
      const slotStartDate = new Date(targetDate);
      slotStartDate.setUTCHours(Math.floor(slotStart / 60), slotStart % 60, 0, 0);

      const slotEndDate = new Date(targetDate);
      slotEndDate.setUTCHours(Math.floor(slotEnd / 60), slotEnd % 60, 0, 0);

      // Check if candidate slot overlaps with any booked session
      const isOverlapping = existingSessions.some((session) => {
        const sessionStart = new Date(session.scheduledAt).getTime();
        const sessionEnd = new Date(session.scheduledEndAt || (sessionStart + session.durationMinutes * 60000)).getTime();

        return slotStartDate.getTime() < sessionEnd && slotEndDate.getTime() > sessionStart;
      });

      // Check if candidate slot is in the past
      const isPast = slotStartDate.getTime() < Date.now();

      if (!isOverlapping && !isPast) {
        availableSlots.push({
          startTime: formatTime(slotStart),
          endTime: formatTime(slotEnd),
          scheduledAt: slotStartDate.toISOString(),
        });
      }

      // Move to next candidate slot with buffer gap
      slotStart += sessionDurationMinutes + bufferMinutes;
    }
  }

  return availableSlots;
};

module.exports = {
  setWeeklyAvailability,
  getWeeklyAvailability,
  setOverride,
  deleteOverride,
  getAvailableSlots,
};
