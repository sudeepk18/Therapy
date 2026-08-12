import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // sends the httpOnly cookie automatically
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach token from localStorage if present (Postman/mobile fallback)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('unfazed_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — auto-redirect on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('unfazed_token');
      localStorage.removeItem('unfazed_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
