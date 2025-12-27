/**
 * API Service
 * 
 * Axios instance configured for Auth0 authentication.
 * Token is set by AuthContext after successful Auth0 login.
 * 
 * Note: Authorization header is set dynamically by AuthContext
 * via api.defaults.headers.common['Authorization']
 */
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor - token is set by AuthContext
api.interceptors.request.use(
  (config) => {
    // Token is already set in defaults by AuthContext
    // This interceptor can be used for additional request modifications
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Auth0 will handle re-authentication
      // Only redirect if not already on login/landing page
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
