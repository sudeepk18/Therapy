import api from './axios';

/**
 * crisis.api.js
 * API calls for Crisis Alerts & Safety Triaging.
 */
export const crisisApi = {
  // ── Therapist endpoints ─────────────────────────────────────────────────

  // Get unreviewed crisis alerts
  getAlerts: () =>
    api.get('/crisis/alerts'),

  // Get all crisis alerts (including reviewed)
  getAllAlerts: () =>
    api.get('/crisis/alerts/all'),

  // Get crisis alerts for a specific client
  getClientAlerts: (clientId) =>
    api.get(`/crisis/client/${clientId}`),

  // Mark a crisis alert as reviewed
  reviewAlert: (alertId, data) =>
    api.patch(`/crisis/alerts/${alertId}/review`, data),

  // Get count of unreviewed alerts (for badge)
  getAlertCount: () =>
    api.get('/crisis/count'),
};
