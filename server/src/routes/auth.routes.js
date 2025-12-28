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
  completeOnboarding,
  getBehavioralProfile,
  getOnboardingStatus,
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth0.middleware.js';

const router = Router();

// Auth0 user sync endpoint (protected by Auth0 JWT)
router.post('/sync', protect, syncAuth0User);

// Protected routes (require Auth0 JWT or manual JWT)
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

// Onboarding and behavioral profile
router.post('/complete-onboarding', protect, completeOnboarding);
router.get('/behavioral-profile', protect, getBehavioralProfile);
router.get('/onboarding-status', protect, getOnboardingStatus);

// Manual login/register routes
router.post('/register', register);
router.post('/login', login);

export default router;
