import api from './axios';

export const authApi = {
  // Therapist auth
  register:           (data)       => api.post('/auth/register-therapist', data),
  login:              (data)       => api.post('/auth/login', data),
  logout:             ()           => api.post('/auth/logout'),
  me:                 ()           => api.get('/auth/me'),

  // Client portal auth
  clientLogin:        (data)       => api.post('/auth/login', { ...data, role: 'client' }),
  setClientPassword:  (data)       => api.post('/auth/set-client-password', data),
  inviteClient:       (clientId)   => api.post(`/auth/invite-client/${clientId}`),
};
