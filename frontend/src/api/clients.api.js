import api from './axios';

export const clientsApi = {
  list:      (params) => api.get('/clients', { params }),
  getById:   (id)     => api.get(`/clients/${id}`),
  create:    (data)   => api.post('/clients', data),
  update:    (id, data) => api.patch(`/clients/${id}`, data),
  discharge: (id, data) => api.post(`/clients/${id}/discharge`, data),
};
