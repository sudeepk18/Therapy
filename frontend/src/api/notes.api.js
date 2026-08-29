import api from './axios';

export const notesApi = {
  getBySession: (sessionId) => api.get(`/session-notes/session/${sessionId}`),
  getByClient:  (clientId, params) => api.get(`/session-notes/client/${clientId}`, { params }),
  getById:      (id) => api.get(`/session-notes/${id}`),
  create:       (data) => api.post('/session-notes', data),
  update:       (id, data) => api.patch(`/session-notes/${id}`, data),
  finalize:     (id) => api.post(`/session-notes/${id}/finalize`),
  sign:         (id) => api.post(`/session-notes/${id}/sign`),
  toggleShare:  (id, share) => api.patch(`/session-notes/${id}/share`, { share }),
  delete:       (id) => api.delete(`/session-notes/${id}`),
};
