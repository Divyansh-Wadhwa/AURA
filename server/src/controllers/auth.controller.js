import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import config from '../config/env.js';
import logger from '../utils/logger.js';
import { getProfileForDisplay, getFeedbackStrategy } from '../services/behavioralProfile.service.js';

const generateToken = (id) => {
  return jwt.sign({ id }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
};

/**
 * Sync Auth0 user with backend database
 * Creates new user if doesn't exist, updates if exists
 * Called after successful Auth0 authentication
 */
export const syncAuth0User = async (req, res, next) => {
  try {
    const { auth0Id, email, name, picture } = req.body;

    if (!auth0Id || !email) {
      return res.status(400).json({
        success: false,
        message: 'auth0Id and email are required',
      });
    }

    // Find existing user by Auth0 ID or email
    let user = await User.findOne({
      $or: [{ auth0Id }, { email }],
    });

    if (user) {
      // Update existing user with Auth0 info
      user.auth0Id = auth0Id;
      user.name = name || user.name;
      user.avatar = picture || user.avatar;
      user.lastLogin = new Date();
      await user.save();
      
      logger.info(`[Auth0] User synced: ${email}`);
    } else {
      // Create new user from Auth0 data
      user = await User.create({
        auth0Id,
        email,
        name: name || email.split('@')[0],
        avatar: picture,
        // No password needed for Auth0 users
        password: undefined,
        lastLogin: new Date(),
      });
      
      logger.info(`[Auth0] New user created: ${email}`);
    }

    res.status(200).json({
      success: true,
      data: user.toJSON(),
    });
  } catch (error) {
    logger.error(`[Auth0] Sync error: ${error.message}`);
    next(error);
  }
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    const user = await User.create({
      name,
      email,
      password,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      data: {
        user: user.toJSON(),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      data: {
        user: user.toJSON(),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, avatar } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, avatar },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Complete onboarding and mark user as onboarded
 */
export const completeOnboarding = async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 
        onboardingCompleted: true,
        onboardingSessionId: sessionId || null,
      },
      { new: true }
    );

    logger.info(`[Auth] Onboarding completed for user: ${user.email}`);

    res.status(200).json({
      success: true,
      data: {
        onboardingCompleted: true,
        user: user.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get behavioral profile for dashboard display
 * Returns only human-readable content, never raw metrics
 */
export const getBehavioralProfile = async (req, res, next) => {
  try {
    const profile = await getProfileForDisplay(req.user._id);
    const feedbackStrategy = await getFeedbackStrategy(req.user._id);

    res.status(200).json({
      success: true,
      data: {
        ...profile,
        feedbackStrategy: {
          tone: feedbackStrategy.tone,
          emphasis: feedbackStrategy.emphasis,
          showNumbers: feedbackStrategy.showNumbers,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check onboarding status
 */
export const getOnboardingStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      data: {
        onboardingCompleted: user?.onboardingCompleted || false,
        hasBaseline: user?.behavioralProfile?.hasBaseline || false,
      },
    });
  } catch (error) {
    next(error);
  }
};
