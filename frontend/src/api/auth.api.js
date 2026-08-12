import api from './axios';

export const authApi = {
  register: (data) => api.post('/auth/register-therapist', data),
  login:    (data) => api.post('/auth/login', data),
  logout:   ()     => api.post('/auth/logout'),
  me:       ()     => api.get('/auth/me'),
};
