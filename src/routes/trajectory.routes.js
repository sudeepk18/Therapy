/**
 * @file trajectory.routes.js
 * @description Routes for the Longitudinal Recovery Trajectory.
 *
 * Computes and returns multi-session sentiment trend data for
 * therapist visualization (Recharts graph on client detail page).
 */

const express = require('express');
const router  = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse  = require('../utils/ApiResponse');
const ApiError     = require('../utils/ApiError');
const { SessionNote } = require('../models');
const aiService    = require('../services/ai.service');

// All trajectory routes require authentication
router.use(protect);

/**
 * @route   GET /api/v1/trajectory/:clientId
 * @desc    Get the recovery trajectory for a client
 * @access  Private (Therapist)
 */
router.get('/:clientId', restrictTo('therapist'), asyncHandler(async (req, res) => {
  const { clientId } = req.params;

  // Fetch all session notes for this client that have sentiment data
  const notes = await SessionNote.find({
    clientId,
    therapistId: req.user._id,
    'aiAnalysis.sentiment.score': { $exists: true },
  })
    .sort({ createdAt: 1 })
    .select('sessionId aiAnalysis.sentiment createdAt')
    .limit(50);

  if (!notes.length) {
    return res.status(200).json(new ApiResponse(200, {
      trajectory: null,
      message: 'No session notes with sentiment data found. Analyze session notes first to build the recovery trajectory.',
    }, 'No trajectory data available'));
  }

  // Build sentiment data array for the AI service
  const sentimentData = notes.map(note => ({
    session_id:   note.sessionId?.toString() || note._id.toString(),
    session_date: note.createdAt.toISOString().split('T')[0],
    score:        note.aiAnalysis?.sentiment?.score || 0,
    label:        note.aiAnalysis?.sentiment?.label || 'NEUTRAL',
    positive:     note.aiAnalysis?.sentiment?.positive || 0,
    negative:     note.aiAnalysis?.sentiment?.negative || 0,
    neutral:      note.aiAnalysis?.sentiment?.neutral || 0,
  }));

  // Call AI service for trajectory analysis
  const trajectory = await aiService.analyzeTrajectory(clientId, sentimentData);

  if (!trajectory) {
    return res.status(200).json(new ApiResponse(200, {
      trajectory: null,
      aiUnavailable: true,
    }, 'AI service unavailable — trajectory could not be computed'));
  }

  res.status(200).json(new ApiResponse(200, { trajectory }, 'Recovery trajectory computed'));
}));

module.exports = router;
