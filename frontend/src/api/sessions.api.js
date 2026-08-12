import api from './axios';

export const sessionsApi = {
  list:         (params)     => api.get('/sessions', { params }),
  getById:      (id)         => api.get(`/sessions/${id}`),
  book:         (data)       => api.post('/sessions', data),
  updateStatus: (id, data)   => api.patch(`/sessions/${id}/status`, data),
  cancel:       (id, data)   => api.post(`/sessions/${id}/cancel`, data),
  availability: (params)     => api.get('/availability/slots', { params }),
};
