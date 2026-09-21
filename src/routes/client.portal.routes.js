/**
 * @file client.portal.routes.js
 * @description Protected API routes for authenticated clients (client portal).
 * All routes require a valid JWT with role: 'client'.
 */

const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { Client, Session, Therapist } = require('../models');

// All portal routes require a logged-in client
router.use(protect);
router.use(restrictTo('client'));

/**
 * @route   GET /api/v1/portal/me
 * @desc    Get the currently logged-in client's own profile
 * @access  Private (Client)
 */
router.get('/me', asyncHandler(async (req, res) => {
  const client = await Client.findById(req.user._id);
  if (!client) {
    throw new ApiError(404, 'Client profile not found.');
  }
  res.status(200).json(new ApiResponse(200, client, 'Client profile fetched'));
}));

/**
 * @route   GET /api/v1/portal/sessions
 * @desc    Get the client's sessions (upcoming + past)
 * @access  Private (Client)
 */
router.get('/sessions', asyncHandler(async (req, res) => {
  const now = new Date();

  const [upcoming, past] = await Promise.all([
    Session.find({
      clientId: req.user._id,
      status: 'scheduled',
      scheduledAt: { $gte: now },
    }).sort({ scheduledAt: 1 }).limit(10),

    Session.find({
      clientId: req.user._id,
      status: { $in: ['completed', 'cancelled', 'no_show'] },
    }).sort({ scheduledAt: -1 }).limit(20),
  ]);

  res.status(200).json(
    new ApiResponse(200, { upcoming, past }, 'Sessions fetched successfully')
  );
}));

/**
 * @route   GET /api/v1/portal/therapist
 * @desc    Get the client's therapist public profile info
 * @access  Private (Client)
 */
router.get('/therapist', asyncHandler(async (req, res) => {
  const therapist = await Therapist.findById(req.user.therapistId).select(
    'name email phone avatar practiceName brandColor slug professionalDetails socialLinks isBookingOpen'
  );
  if (!therapist) {
    throw new ApiError(404, 'Therapist not found.');
  }
  res.status(200).json(new ApiResponse(200, therapist, 'Therapist info fetched'));
}));

module.exports = router;
