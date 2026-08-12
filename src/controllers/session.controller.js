/**
 * @file session.controller.js
 * @description Controller for Session appointment booking, scheduling, and cancellations.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const sessionService = require('../services/session.service');

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

module.exports = {
  bookSession,
  getSessions,
  getSessionById,
  updateSessionStatus,
  cancelSession,
};
