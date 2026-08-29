import api from './axios';

/**
 * client.portal.api.js
 * Public-facing API calls for the Client Portal.
 * These endpoints are accessible WITHOUT therapist authentication.
 * Clients find their therapist by slug (e.g. /client/drpriya).
 */
export const clientPortalApi = {
  // Get therapist public profile + availability by slug
  getTherapistBySlug: (slug) =>
    api.get(`/therapist/public/${slug}`),

  // Get available booking slots for a therapist
  getAvailableSlots: (slug, params) =>
    api.get(`/availability/public/${slug}`, { params }),

  // Client submits a booking request (no auth — captures lead)
  requestBooking: (slug, data) =>
    api.post(`/sessions/public/book/${slug}`, data),

  // Get shared notes for a client (client-token auth or public link)
  getSharedNote: (noteId, token) =>
    api.get(`/session-notes/shared/${noteId}`, {
      headers: token ? { 'x-share-token': token } : {},
    }),

  // ── Authenticated client portal endpoints ─────────────────────────────────
  // These require a valid client JWT cookie/token

  // Get the logged-in client's own profile
  getMyProfile: () =>
    api.get('/portal/me'),

  // Get the logged-in client's sessions (upcoming + past)
  getMySessions: () =>
    api.get('/portal/sessions'),

  // Get the logged-in client's therapist info
  getMyTherapist: () =>
    api.get('/portal/therapist'),
};
