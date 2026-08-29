/**
 * @file ai.api.js
 * @description Frontend API calls for the AI Intelligence Layer.
 *
 * All calls go to the Node.js backend (/api/v1/ai).
 * React NEVER calls the Python AI service directly.
 *
 * Note: AI features are therapist-only. These methods should
 * only be called from therapist-facing components.
 */

import api from './axios';

export const aiApi = {
  // ── System ────────────────────────────────────────────────────────────────

  /** Check if the AI service is online */
  health: () => api.get('/ai/health'),

  // ── Dashboard ─────────────────────────────────────────────────────────────

  /** Get combined AI insights for the dashboard */
  getInsights: () => api.get('/ai/insights'),

  // ── No-Show Prediction ────────────────────────────────────────────────────

  /** Predict no-show risk for a specific session */
  predictNoShow: (sessionId) => api.post(`/ai/no-show/${sessionId}`),

  /** Get upcoming sessions with risk scores */
  getUpcomingWithRisk: () => api.get('/ai/no-show/upcoming'),

  // ── Sentiment Analysis ────────────────────────────────────────────────────

  /** Analyze sentiment for a specific note */
  analyzeSentiment: (noteId) => api.post(`/ai/sentiment/${noteId}`),

  /** Get engagement trend for a specific client */
  getClientEngagement: (clientId) => api.get(`/ai/engagement/${clientId}`),

  // ── SOAP Draft ────────────────────────────────────────────────────────────

  /** Generate a SOAP note draft from free-form text */
  generateSoapDraft: (freeText, noteId = null) =>
    api.post('/ai/soap/draft', { freeText, noteId }),

  // ── Scheduling ────────────────────────────────────────────────────────────

  /** Get scheduling slot recommendations */
  getSchedulingRecommendations: () => api.get('/ai/scheduling/recommend'),

  // ── Revenue Forecast ──────────────────────────────────────────────────────

  /** Get revenue forecast */
  getRevenueForecast: () => api.get('/ai/forecast/revenue'),
};
