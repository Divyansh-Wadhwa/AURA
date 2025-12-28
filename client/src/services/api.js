/**
 * API Service - Axios instance with auth interceptor
 * Automatically adds auth token from localStorage to all requests
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

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Check for manual token first
    const manualToken = localStorage.getItem('aura_manual_token');
    if (manualToken) {
      config.headers.Authorization = `Bearer ${manualToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
