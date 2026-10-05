/**
 * @file cbt.routes.js
 * @description Routes for CBT Thought Record (Between-Session Homework).
 *
 * Client-facing routes: Create thought records, complete reframing exercises.
 * Therapist-facing routes: View client homework summaries.
 */

const express = require('express');
const router  = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse  = require('../utils/ApiResponse');
const ApiError     = require('../utils/ApiError');
const { CBTThoughtRecord, Client } = require('../models');
const aiService    = require('../services/ai.service');

// All CBT routes require authentication
router.use(protect);

// ── Client Routes ────────────────────────────────────────────────────────────

/**
 * @route   POST /api/v1/cbt/thought
 * @desc    Submit a new automatic negative thought for AI analysis
 * @access  Private (Client)
 */
router.post('/thought', restrictTo('client'), asyncHandler(async (req, res) => {
  const { automaticThought, moodBefore } = req.body;

  if (!automaticThought || !automaticThought.trim()) {
    throw new ApiError(400, 'Automatic thought text is required.');
  }

  const client = await Client.findById(req.user._id);
  if (!client) throw new ApiError(404, 'Client not found.');

  // Call AI service for distortion analysis
  const aiResult = await aiService.analyzeCBT(
    req.user._id.toString(),
    automaticThought.trim()
  );

  // Also run a passive crisis scan on the thought text
  const crisisResult = await aiService.scanCrisis(
    req.user._id.toString(),
    automaticThought.trim(),
    'cbt_thought'
  );

  // Save the thought record with AI analysis
  const record = await CBTThoughtRecord.create({
    clientId:          req.user._id,
    therapistId:       client.therapistId,
    automaticThought:  automaticThought.trim(),
    moodBefore:        moodBefore || null,
    distortions:       aiResult?.distortions || [],
    primaryDistortion: aiResult?.primary_distortion || 'none',
    distortionCount:   aiResult?.distortion_count || 0,
    aiModelVersion:    aiResult?.model_version || '',
  });

  // If crisis detected, create a crisis alert
  if (crisisResult && crisisResult.alert_therapist) {
    const { CrisisAlert, Notification } = require('../models');

    const alert = await CrisisAlert.create({
      clientId:         req.user._id,
      therapistId:      client.therapistId,
      source:           'cbt_thought',
      sourceText:       automaticThought.trim().substring(0, 500),
      riskLevel:        crisisResult.risk_level,
      riskScore:        crisisResult.risk_score,
      flags:            crisisResult.flags || [],
      alertedTherapist: true,
      shownCrisisUI:    crisisResult.show_crisis_ui,
      aiModelVersion:   crisisResult.model_version || '',
    });

    // Create an urgent notification for the therapist
    await Notification.create({
      therapistId: client.therapistId,
      type:        'system',
      subType:     'general',
      clientId:    req.user._id,
      title:       `🚨 Safety Alert: ${client.name}`,
      message:     `Client flagged ${crisisResult.risk_level} distress in CBT thought record. Immediate review recommended.`,
      clientName:  client.name,
    });
  }

  res.status(201).json(new ApiResponse(201, {
    record,
    crisisDetected: crisisResult?.alert_therapist || false,
    showCrisisUI:   crisisResult?.show_crisis_ui || false,
    resources:      crisisResult?.resources || [],
  }, 'Thought recorded and analyzed'));
}));

/**
 * @route   PATCH /api/v1/cbt/thought/:id/reframe
 * @desc    Complete the 3-step reframing exercise
 * @access  Private (Client)
 */
router.patch('/thought/:id/reframe', restrictTo('client'), asyncHandler(async (req, res) => {
  const { evidenceFor, evidenceAgainst, balancedThought, moodAfter } = req.body;

  const record = await CBTThoughtRecord.findOne({
    _id: req.params.id,
    clientId: req.user._id,
  });

  if (!record) throw new ApiError(404, 'Thought record not found.');

  record.evidenceFor     = evidenceFor || '';
  record.evidenceAgainst = evidenceAgainst || '';
  record.balancedThought = balancedThought || '';
  record.moodAfter       = moodAfter || null;
  record.isCompleted     = !!(balancedThought && balancedThought.trim());

  await record.save();

  res.status(200).json(new ApiResponse(200, record, 'Reframing exercise saved'));
}));

/**
 * @route   GET /api/v1/cbt/my-records
 * @desc    Get the logged-in client's thought records
 * @access  Private (Client)
 */
router.get('/my-records', restrictTo('client'), asyncHandler(async (req, res) => {
  const records = await CBTThoughtRecord.find({ clientId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);

  res.status(200).json(new ApiResponse(200, { records }, 'CBT records fetched'));
}));

// ── Therapist Routes ─────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/cbt/client/:clientId/summary
 * @desc    Get a summary of a client's CBT homework (for therapist)
 * @access  Private (Therapist)
 */
router.get('/client/:clientId/summary', restrictTo('therapist'), asyncHandler(async (req, res) => {
  const { clientId } = req.params;

  const records = await CBTThoughtRecord.find({
    clientId,
    therapistId: req.user._id,
  }).sort({ createdAt: -1 }).limit(30);

  // Compute summary
  const total       = records.length;
  const completed   = records.filter(r => r.isCompleted).length;
  const thisWeek    = records.filter(r => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return r.createdAt >= weekAgo;
  });

  // Count distortion types
  const distortionCounts = {};
  records.forEach(r => {
    if (r.primaryDistortion && r.primaryDistortion !== 'none') {
      distortionCounts[r.primaryDistortion] = (distortionCounts[r.primaryDistortion] || 0) + 1;
    }
  });

  // Find predominant distortion
  const predominantDistortion = Object.entries(distortionCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none';

  // Average mood improvement
  const completedWithMood = records.filter(r => r.moodBefore && r.moodAfter);
  const avgMoodImprovement = completedWithMood.length > 0
    ? Math.round((completedWithMood.reduce((sum, r) => sum + (r.moodAfter - r.moodBefore), 0) / completedWithMood.length) * 10) / 10
    : 0;

  res.status(200).json(new ApiResponse(200, {
    records,
    summary: {
      totalRecords: total,
      completedReframes: completed,
      thisWeekCount: thisWeek.length,
      thisWeekCompleted: thisWeek.filter(r => r.isCompleted).length,
      predominantDistortion,
      distortionBreakdown: distortionCounts,
      avgMoodImprovement,
    },
  }, 'CBT homework summary fetched'));
}));

module.exports = router;
