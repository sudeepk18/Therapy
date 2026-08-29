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

// Response interceptor — auto-redirect on 401 based on user role
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('unfazed_token');
      localStorage.removeItem('unfazed_user');

      // Redirect to the correct login page based on user role
      const storedUser = localStorage.getItem('unfazed_user');
      const storedRole = localStorage.getItem('unfazed_role');

      if (storedRole === 'client') {
        // Try to extract slug from the current URL: /client/:slug/*
        const match = window.location.pathname.match(/^\/client\/([^/]+)/);
        const slug = match ? match[1] : null;
        if (slug && !window.location.pathname.includes('/login')) {
          window.location.href = `/client/${slug}/login`;
        }
      } else {
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
