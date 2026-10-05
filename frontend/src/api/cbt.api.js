import api from './axios';

/**
 * cbt.api.js
 * API calls for CBT Thought Records (Between-Session Homework).
 */
export const cbtApi = {
  // ── Client endpoints ────────────────────────────────────────────────────
  
  // Submit a new automatic negative thought for AI analysis
  submitThought: (data) =>
    api.post('/cbt/thought', data),

  // Complete the 3-step reframing exercise
  submitReframe: (recordId, data) =>
    api.patch(`/cbt/thought/${recordId}/reframe`, data),

  // Get the logged-in client's thought records
  getMyRecords: () =>
    api.get('/cbt/my-records'),

  // ── Therapist endpoints ─────────────────────────────────────────────────

  // Get a client's CBT homework summary
  getClientSummary: (clientId) =>
    api.get(`/cbt/client/${clientId}/summary`),
};
