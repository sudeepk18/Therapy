import api from './axios';

export const paymentsApi = {
  list:           (params) => api.get('/payments', { params }),
  revenueSummary: (params) => api.get('/payments/revenue-summary', { params }),
  markManual:     (data)   => api.post('/payments/manual', data),
  refund:         (id, data) => api.post(`/payments/${id}/refund`, data),
};
