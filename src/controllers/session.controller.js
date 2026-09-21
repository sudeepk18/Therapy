/**
 * @file session.controller.js
 * @description Controller for Session appointment booking, scheduling, and cancellations.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const sessionService = require('../services/session.service');
const { Therapist, Lead } = require('../models');

/**
 * @route   POST /api/v1/sessions
 * @desc    Book a new therapy session appointment
 * @access  Private (Therapist or Client)
 */
const bookSession = asyncHandler(async (req, res) => {
  const { clientId, scheduledAt } = req.body;

  // If therapist is calling, therapistId is req.user._id.
  // If client is calling, therapistId must be provided or derived from client's therapistId.
  let therapistId = req.body.therapistId;
  let targetClientId = clientId;

  if (req.userRole === 'therapist') {
    therapistId = req.user._id;
  } else if (req.userRole === 'client') {
    targetClientId = req.user._id;
    therapistId = req.user.therapistId;
  }

  if (!therapistId || !targetClientId || !scheduledAt) {
    throw new ApiError(400, 'therapistId, clientId, and scheduledAt are required');
  }

  const session = await sessionService.bookSession({
    ...req.body,
    therapistId,
    clientId: targetClientId,
  });

  res.status(201).json(new ApiResponse(201, session, 'Session appointment booked successfully'));
});

/**
 * @route   GET /api/v1/sessions
 * @desc    List sessions for authenticated therapist or client
 * @access  Private
 */
const getSessions = asyncHandler(async (req, res) => {
  const filterQuery = { ...req.query };

  if (req.userRole === 'therapist') {
    filterQuery.therapistId = req.user._id;
  } else if (req.userRole === 'client') {
    filterQuery.clientId = req.user._id;
  }

  const result = await sessionService.getSessions(filterQuery, req.query);
  res.status(200).json(new ApiResponse(200, result, 'Sessions list fetched'));
});

/**
 * @route   GET /api/v1/sessions/:id
 * @desc    Get session details by ID
 * @access  Private
 */
const getSessionById = asyncHandler(async (req, res) => {
  const session = await sessionService.getSessionById(req.params.id, req.user._id);
  res.status(200).json(new ApiResponse(200, session, 'Session details fetched'));
});

/**
 * @route   PATCH /api/v1/sessions/:id/status
 * @desc    Update session status (completed, in_progress, no_show)
 * @access  Private (Therapist)
 */
const updateSessionStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) {
    throw new ApiError(400, 'Status field is required');
  }

  const session = await sessionService.updateSessionStatus(req.params.id, req.user._id, status);
  res.status(200).json(new ApiResponse(200, session, 'Session status updated'));
});

/**
 * @route   POST /api/v1/sessions/:id/cancel
 * @desc    Cancel a session appointment
 * @access  Private (Therapist or Client)
 */
const cancelSession = asyncHandler(async (req, res) => {
  const cancelledBy = req.userRole; // 'therapist' or 'client'
  const session = await sessionService.cancelSession(req.params.id, cancelledBy, req.body);
  res.status(200).json(new ApiResponse(200, session, 'Session appointment cancelled'));
});

/**
 * @route   POST /api/v1/sessions/public/book/:slug
 * @desc    Public booking request — captures enquiry as a Lead.
 *          No authentication required. The therapist reviews leads and
 *          confirms the booking from the CRM dashboard.
 * @access  Public
 */
const publicBookSession = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const {
    clientName, clientEmail, clientPhone,
    sessionType, medium, scheduledAt, notes, durationMinutes,
  } = req.body;

  if (!clientName || !clientEmail) {
    throw new ApiError(400, 'Your name and email are required to request a booking');
  }

  const therapist = await Therapist.findOne({ slug, isActive: true });
  if (!therapist) {
    throw new ApiError(404, 'Therapist not found for this workspace');
  }

  if (!therapist.isBookingOpen) {
    throw new ApiError(403, 'This therapist is not currently accepting new bookings');
  }

  const parsedMedium = (medium === 'online' || medium === 'video') ? 'video' :
    (medium === 'in-person' || medium === 'in_person') ? 'in_person' :
    (medium === 'phone' || medium === 'audio') ? 'audio' :
    (medium === 'chat') ? 'chat' : 'video';

  const duration = Number(durationMinutes) || (sessionType === 'consultation' ? 15 : 50);

  // Build a descriptive enquiry message
  const enquiryParts = [];
  if (sessionType) enquiryParts.push(`Session type: ${sessionType}`);
  if (medium)      enquiryParts.push(`Preferred mode: ${medium}`);
  if (scheduledAt) enquiryParts.push(`Requested time: ${new Date(scheduledAt).toLocaleString('en-IN')}`);
  if (notes)       enquiryParts.push(`Notes: ${notes}`);

  const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;

  const lead = await Lead.create({
    therapistId:      therapist._id,
    name:             clientName,
    email:            clientEmail.toLowerCase().trim(),
    phone:            clientPhone || undefined,
    enquiryMessage:   enquiryParts.join(' | ') || undefined,
    referralSource:   'booking_page',
    preferredMedium:  parsedMedium,
    status:           'new',
    priority:         'high',
    bookingDetails: scheduledDate ? {
      scheduledAt:     scheduledDate,
      durationMinutes: duration,
      sessionType:     sessionType || 'individual',
      medium:          parsedMedium,
      notes:           notes || '',
      status:          'pending',
    } : undefined,
  });

  res.status(201).json(
    new ApiResponse(201, { leadId: lead._id, bookingDetails: lead.bookingDetails }, 'Booking request received! The therapist will review and confirm your appointment.')
  );
});

module.exports = {
  bookSession,
  getSessions,
  getSessionById,
  updateSessionStatus,
  cancelSession,
  publicBookSession,
};
