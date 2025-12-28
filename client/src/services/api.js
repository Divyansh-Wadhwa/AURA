/**
 * API Service - Axios instance with Auth0 token injection
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

// Store for token getter function (set by AuthContext)
let tokenGetter = null;

export const setTokenGetter = (getter) => {
  tokenGetter = getter;
};

// Request interceptor - get fresh token for each request
api.interceptors.request.use(
  async (config) => {
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
