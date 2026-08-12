/**
 * @file availability.controller.js
 * @description Controller for Therapist Working Hours & Availability endpoints.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const availabilityService = require('../services/availability.service');

/**
 * @route   PUT /api/v1/availability/weekly
 * @desc    Set or update recurring weekly working hours
 * @access  Private (Therapist)
 */
const setWeeklyAvailability = asyncHandler(async (req, res) => {
  const { weeklySchedule } = req.body;
  if (!weeklySchedule || !Array.isArray(weeklySchedule)) {
    throw new ApiError(400, 'weeklySchedule must be an array of day availability rules');
  }

  const rules = await availabilityService.setWeeklyAvailability(req.user._id, weeklySchedule);
  res.status(200).json(new ApiResponse(200, rules, 'Weekly availability schedule updated'));
});

/**
 * @route   GET /api/v1/availability/weekly
 * @desc    Get therapist's recurring weekly working hours
 * @access  Private (Therapist)
 */
const getWeeklyAvailability = asyncHandler(async (req, res) => {
  const rules = await availabilityService.getWeeklyAvailability(req.user._id);
  res.status(200).json(new ApiResponse(200, rules, 'Weekly schedule fetched'));
});

/**
 * @route   POST /api/v1/availability/override
 * @desc    Add or update a date-specific override
 * @access  Private (Therapist)
 */
const setOverride = asyncHandler(async (req, res) => {
  const { overrideDate } = req.body;
  if (!overrideDate) {
    throw new ApiError(400, 'overrideDate is required');
  }

  const override = await availabilityService.setOverride(req.user._id, req.body);
  res.status(200).json(new ApiResponse(200, override, 'Date override saved'));
});

/**
 * @route   DELETE /api/v1/availability/override/:id
 * @desc    Remove a date override
 * @access  Private (Therapist)
 */
const deleteOverride = asyncHandler(async (req, res) => {
  await availabilityService.deleteOverride(req.user._id, req.params.id);
  res.status(200).json(new ApiResponse(200, null, 'Date override removed'));
});

/**
 * @route   GET /api/v1/availability/slots
 * @desc    Get available free booking time slots for a specific date (Public / Client / Therapist)
 * @access  Public
 */
const getAvailableSlots = asyncHandler(async (req, res) => {
  const { therapistId, date, duration } = req.query;

  if (!therapistId || !date) {
    throw new ApiError(400, 'therapistId and date (YYYY-MM-DD) query parameters are required');
  }

  const durationMinutes = duration ? parseInt(duration, 10) : 50;
  const slots = await availabilityService.getAvailableSlots(therapistId, date, durationMinutes);

  res.status(200).json(new ApiResponse(200, { therapistId, date, durationMinutes, slots }, 'Available slots computed'));
});

module.exports = {
  setWeeklyAvailability,
  getWeeklyAvailability,
  setOverride,
  deleteOverride,
  getAvailableSlots,
};
