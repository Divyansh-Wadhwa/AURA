/**
 * API Service - Axios instance with Auth0 and manual token support
 * Supports both Auth0 token getter and localStorage manual tokens
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

// Store for token getter function (set by AuthContext for Auth0)
let tokenGetter = null;

export const setTokenGetter = (getter) => {
  tokenGetter = getter;
};

// Request interceptor - supports both Auth0 and manual tokens
api.interceptors.request.use(
  async (config) => {
    // Check for manual token first (localStorage)
    const manualToken = localStorage.getItem('aura_manual_token');
    if (manualToken) {
      config.headers.Authorization = `Bearer ${manualToken}`;
      return config;
    }
    
    // Otherwise use Auth0 token getter
    if (tokenGetter) {
      try {
        const token = await tokenGetter();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (err) {
        console.error('[API] Token error:', err);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
