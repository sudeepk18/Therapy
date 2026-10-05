/**
 * @file crisis.routes.js
 * @description Routes for Crisis Alerts & Safety Triaging.
 *
 * Client-facing: Passive crisis scanning happens in CBT/journal routes.
 * Therapist-facing: View and manage crisis alerts for their clients.
 */

const express = require('express');
const router  = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse  = require('../utils/ApiResponse');
const ApiError     = require('../utils/ApiError');
const { CrisisAlert } = require('../models');

// All crisis routes require authentication
router.use(protect);

// ── Therapist Routes ─────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/crisis/alerts
 * @desc    Get all unreviewed crisis alerts for the therapist
 * @access  Private (Therapist)
 */
router.get('/alerts', restrictTo('therapist'), asyncHandler(async (req, res) => {
  const alerts = await CrisisAlert.find({
    therapistId: req.user._id,
    isReviewed: false,
  })
    .sort({ createdAt: -1 })
    .populate('clientId', 'name email phone')
    .limit(50);

  res.status(200).json(new ApiResponse(200, { alerts }, 'Crisis alerts fetched'));
}));

/**
 * @route   GET /api/v1/crisis/alerts/all
 * @desc    Get all crisis alerts (including reviewed) for the therapist
 * @access  Private (Therapist)
 */
router.get('/alerts/all', restrictTo('therapist'), asyncHandler(async (req, res) => {
  const alerts = await CrisisAlert.find({
    therapistId: req.user._id,
  })
    .sort({ createdAt: -1 })
    .populate('clientId', 'name email phone')
    .limit(100);

  res.status(200).json(new ApiResponse(200, { alerts }, 'All crisis alerts fetched'));
}));

/**
 * @route   GET /api/v1/crisis/client/:clientId
 * @desc    Get crisis alerts for a specific client
 * @access  Private (Therapist)
 */
router.get('/client/:clientId', restrictTo('therapist'), asyncHandler(async (req, res) => {
  const alerts = await CrisisAlert.find({
    therapistId: req.user._id,
    clientId: req.params.clientId,
  })
    .sort({ createdAt: -1 })
    .limit(20);

  res.status(200).json(new ApiResponse(200, { alerts }, 'Client crisis alerts fetched'));
}));

/**
 * @route   PATCH /api/v1/crisis/alerts/:alertId/review
 * @desc    Mark a crisis alert as reviewed with optional therapist notes
 * @access  Private (Therapist)
 */
router.patch('/alerts/:alertId/review', restrictTo('therapist'), asyncHandler(async (req, res) => {
  const { therapistNotes } = req.body;

  const alert = await CrisisAlert.findOne({
    _id: req.params.alertId,
    therapistId: req.user._id,
  });

  if (!alert) throw new ApiError(404, 'Crisis alert not found.');

  alert.isReviewed     = true;
  alert.reviewedAt     = new Date();
  alert.therapistNotes = therapistNotes || '';

  await alert.save();

  res.status(200).json(new ApiResponse(200, alert, 'Crisis alert reviewed'));
}));

/**
 * @route   GET /api/v1/crisis/count
 * @desc    Get count of unreviewed crisis alerts (for badge count)
 * @access  Private (Therapist)
 */
router.get('/count', restrictTo('therapist'), asyncHandler(async (req, res) => {
  const count = await CrisisAlert.countDocuments({
    therapistId: req.user._id,
    isReviewed: false,
    riskLevel: { $in: ['critical', 'high'] },
  });

  res.status(200).json(new ApiResponse(200, { count }, 'Crisis alert count'));
}));

module.exports = router;
