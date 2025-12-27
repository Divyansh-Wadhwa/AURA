/**
 * Auth0 JWT Middleware
 * 
 * Validates JWT tokens issued by Auth0 using RS256 algorithm.
 * Rejects unauthenticated requests to protected routes.
 * 
 * Flow:
 * 1. Extract Bearer token from Authorization header
 * 2. Validate token signature using Auth0's public key (JWKS)
 * 3. Verify issuer, audience, and expiration
 * 4. Attach decoded payload to req.auth
 */
import { auth } from 'express-oauth2-jwt-bearer';
import config from '../config/env.js';
import User from '../models/User.model.js';
import logger from '../utils/logger.js';

/**
 * Auth0 JWT validation middleware
 * Uses express-oauth2-jwt-bearer for RS256 validation
 */
export const checkJwt = auth({
  audience: config.auth0Audience,
  issuerBaseURL: `https://${config.auth0Domain}/`,
  tokenSigningAlg: 'RS256',
});

/**
 * Load user from database after JWT validation
 * Attaches user document to req.user for downstream handlers
 */
export const loadUser = async (req, res, next) => {
  try {
    if (!req.auth?.payload?.sub) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload',
      });
    }

    // Find user by Auth0 ID
    const auth0Id = req.auth.payload.sub;
    let user = await User.findOne({ auth0Id });

    if (!user) {
      // User hasn't been synced yet - they need to call /auth/sync first
      // For now, allow the request but with minimal user info
      req.user = {
        _id: auth0Id,
        auth0Id,
        email: req.auth.payload.email || '',
        name: req.auth.payload.name || 'User',
      };
    } else {
      req.user = user;
    }

    next();
  } catch (error) {
    logger.error(`[Auth0] Load user error: ${error.message}`);
    next(error);
  }
};

/**
 * Combined middleware: JWT validation + user loading
 * Use this for protected routes
 */
export const protect = [checkJwt, loadUser];

/**
 * Optional auth middleware
 * Validates token if present, but doesn't reject if missing
 */
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token provided, continue without auth
    return next();
  }

  // If token is provided, validate it
  try {
    await new Promise((resolve, reject) => {
      checkJwt(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Load user if token is valid
    await new Promise((resolve, reject) => {
      loadUser(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (error) {
    // Token invalid, but since auth is optional, continue without it
    logger.warn(`[Auth0] Optional auth failed: ${error.message}`);
  }

  next();
};

/**
 * Role-based access control middleware
 * Checks if user has required role in Auth0 token
 * 
 * Usage: app.get('/admin', protect, checkRole('admin'), handler)
 */
export const checkRole = (requiredRole) => (req, res, next) => {
  // Roles can be stored in custom claims
  const roles = req.auth?.payload?.[`${config.auth0Audience}/roles`] || [];
  
  if (!roles.includes(requiredRole)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions',
    });
  }
  
  next();
};

export default { checkJwt, loadUser, protect, optionalAuth, checkRole };
