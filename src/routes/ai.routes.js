/**
 * @file ai.routes.js
 * @description Routes for the AI Intelligence Layer.
 *
 * Security pipeline for every route:
 *   protect             → JWT auth required
 *   restrictTo          → therapist role only (clients CANNOT access)
 *   checkFeatureEnabled → subscription entitlement gate
 *
 * Clients are blocked at the restrictTo('therapist') middleware level.
 * All AI outputs are therapist-only decision-support indicators.
 */

const express = require('express');
const router  = express.Router();

const aiController       = require('../controllers/ai.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const { checkFeatureEnabled } = require('../middleware/tierLimit.middleware');

// All AI routes require authentication
router.use(protect);

// ── System ────────────────────────────────────────────────────────────────────
// Health check — no entitlement required, just auth
router.get(
  '/health',
  restrictTo('therapist'),
  aiController.checkAIHealth
);

// ── Dashboard (Combined) ──────────────────────────────────────────────────────
// Returns a combined payload of all available AI insights for the dashboard.
// Respects individual feature flags for each section.
router.get(
  '/insights',
  restrictTo('therapist'),
  aiController.getAIInsightsDashboard
);

// ── No-Show Prediction ────────────────────────────────────────────────────────
// Predict no-show risk for a specific upcoming session
router.post(
  '/no-show/:sessionId',
  restrictTo('therapist'),
  checkFeatureEnabled('aiNoShowPrediction'),
  aiController.predictNoShow
);

// Get all upcoming sessions with their pre-computed risk scores
router.get(
  '/no-show/upcoming',
  restrictTo('therapist'),
  checkFeatureEnabled('aiNoShowPrediction'),
  aiController.getUpcomingWithRisk
);

// ── Sentiment Analysis ────────────────────────────────────────────────────────
// Analyze the linguistic sentiment of a specific note
router.post(
  '/sentiment/:noteId',
  restrictTo('therapist'),
  checkFeatureEnabled('aiSentimentAnalysis'),
  aiController.analyzeSentiment
);

// Get the engagement trend for a client (requires notes with sentiment data)
router.get(
  '/engagement/:clientId',
  restrictTo('therapist'),
  checkFeatureEnabled('aiSentimentAnalysis'),
  aiController.getClientEngagement
);

// ── SOAP Draft Generation ─────────────────────────────────────────────────────
// Generate a SOAP note draft from free-form text
// Uses the existing 'aiNoteSuggestions' flag (already in FeaturesSchema)
router.post(
  '/soap/draft',
  restrictTo('therapist'),
  checkFeatureEnabled('aiNoteSuggestions'),
  aiController.generateSoapDraft
);

// ── Smart Scheduling ──────────────────────────────────────────────────────────
// Get slot recommendations based on booking patterns
router.get(
  '/scheduling/recommend',
  restrictTo('therapist'),
  checkFeatureEnabled('aiSmartScheduling'),
  aiController.getSchedulingRecommendations
);

// ── Revenue Forecasting ───────────────────────────────────────────────────────
// Get revenue forecast based on historical payment data
router.get(
  '/forecast/revenue',
  restrictTo('therapist'),
  checkFeatureEnabled('aiRevenueForecast'),
  aiController.getRevenueForecast
);

module.exports = router;
