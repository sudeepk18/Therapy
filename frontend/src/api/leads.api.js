import api from './axios';

export const leadsApi = {
  list:      (params) => api.get('/leads', { params }),
  getById:   (id)     => api.get(`/leads/${id}`),
  create:    (data)   => api.post('/leads', data),
  update:    (id, data) => api.patch(`/leads/${id}`, data),
  addFollowUp: (id, data) => api.post(`/leads/${id}/follow-up`, data),
  convert:   (id)     => api.post(`/leads/${id}/convert`),
};
