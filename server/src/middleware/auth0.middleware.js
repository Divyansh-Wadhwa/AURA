/**
 * Auth Middleware - Supports both Auth0 and Manual JWT
 * 
 * Auth0: RS256 validation via JWKS
 * Manual: HS256 validation with local secret
 */
import { auth } from 'express-oauth2-jwt-bearer';
import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import User from '../models/User.model.js';
import logger from '../utils/logger.js';

/**
 * Auth0 JWT validation middleware
 * Uses express-oauth2-jwt-bearer for RS256 validation
 */
const jwtCheck = auth({
  audience: config.auth0Audience,
  issuerBaseURL: `https://${config.auth0Domain}/`,
  tokenSigningAlg: 'RS256',
});

// Wrap with error logging
export const checkJwt = (req, res, next) => {
  jwtCheck(req, res, (err) => {
    if (err) {
      logger.error(`[Auth0] JWT validation failed: ${err.message}`);
      return res.status(401).json({
        success: false,
        message: 'Authentication failed',
        error: err.message,
      });
    }
    next();
  });
};

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
 * Combined middleware: Tries manual JWT first, falls back to Auth0
 * Use this for protected routes
 */
export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No token provided',
    });
  }

  const token = authHeader.split(' ')[1];
  
  // Try manual JWT first (faster, no network call)
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.id);
    if (user) {
      req.user = user;
      return next();
    }
  } catch (manualError) {
    // Not a manual JWT, try Auth0
  }

  // Try Auth0 validation
  jwtCheck(req, res, async (err) => {
    if (err) {
      logger.error(`[Auth] JWT validation failed: ${err.message}`);
      return res.status(401).json({
        success: false,
        message: 'Authentication failed',
      });
    }
    await loadUser(req, res, next);
  });
};

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
