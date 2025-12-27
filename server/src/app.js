import express from 'express';
import cors from 'cors';
import config from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import sessionRoutes from './routes/session.routes.js';
import feedbackRoutes from './routes/feedback.routes.js';
import audioRoutes from './routes/audio.routes.js';
import { notFound, errorHandler } from './middleware/error.middleware.js';
import logger from './utils/logger.js';

const app = express();

// CORS configuration
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.originalUrl}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'A.U.R.A Server is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/audio', audioRoutes);

// API info endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'A.U.R.A API v1.0',
    endpoints: {
      auth: '/api/auth',
      session: '/api/session',
      feedback: '/api/feedback',
      audio: '/api/audio',
    },
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

export default app;
