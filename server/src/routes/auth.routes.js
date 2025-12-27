/**
 * Auth Routes
 * 
 * Auth0 Flow:
 * 1. Frontend authenticates via Auth0 Universal Login
 * 2. Frontend calls /auth/sync with Auth0 user data
 * 3. Backend creates/updates user in database
 * 4. All subsequent API calls use Auth0 JWT for authorization
 */
import { Router } from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  syncAuth0User,
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth0.middleware.js';

const router = Router();

// Auth0 user sync endpoint (protected by Auth0 JWT)
router.post('/sync', protect, syncAuth0User);

// Protected routes (require Auth0 JWT)
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

// Legacy routes (kept for backward compatibility, but Auth0 is primary)
router.post('/register', register);
router.post('/login', login);

export default router;
