/**
 * Audio Routes
 * Serves TTS and recorded audio files with Auth0 JWT validation
 */
import express from 'express';
import { createReadStream, existsSync } from 'fs';
import { stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { auth } from 'express-oauth2-jwt-bearer';
import config from '../config/env.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

const TTS_DIR = join(__dirname, '../../uploads/tts');
const AUDIO_DIR = join(__dirname, '../../uploads/audio');

/**
 * Auth0 JWT validation for audio access
 * Supports token in query param (for audio elements) or Authorization header
 */
const verifyAudioAccess = async (req, res, next) => {
  try {
    // Check for token in query param (for audio elements) or header
    let token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    // Set authorization header for Auth0 middleware if token was in query
    if (req.query.token) {
      req.headers.authorization = `Bearer ${token}`;
    }

    // Use Auth0 JWT validation
    const checkJwt = auth({
      audience: config.auth0Audience,
      issuerBaseURL: `https://${config.auth0Domain}/`,
      tokenSigningAlg: 'RS256',
    });

    checkJwt(req, res, (err) => {
      if (err) {
        logger.error(`Audio auth error: ${err.message}`);
        return res.status(401).json({ success: false, message: 'Invalid token' });
      }
      next();
    });
  } catch (error) {
    logger.error(`Audio auth error: ${error.message}`);
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

/**
 * Serve TTS audio files
 * GET /api/audio/tts/:sessionId/:filename
 */
router.get('/tts/:sessionId/:filename', verifyAudioAccess, async (req, res) => {
  try {
    const { sessionId, filename } = req.params;
    const filepath = join(TTS_DIR, sessionId, filename);

    if (!existsSync(filepath)) {
      return res.status(404).json({
        success: false,
        message: 'Audio file not found',
      });
    }

    const stats = await stat(filepath);
    const fileSize = stats.size;

    // Handle range requests for streaming
    const range = req.headers.range;
    
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'audio/mpeg',
      });

      const stream = createReadStream(filepath, { start, end });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mpeg',
      });

      const stream = createReadStream(filepath);
      stream.pipe(res);
    }
  } catch (error) {
    logger.error(`Audio serve error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to serve audio file',
    });
  }
});

/**
 * Serve recorded audio files
 * GET /api/audio/recording/:sessionId/:filename
 */
router.get('/recording/:sessionId/:filename', verifyAudioAccess, async (req, res) => {
  try {
    const { sessionId, filename } = req.params;
    const filepath = join(AUDIO_DIR, sessionId, filename);

    if (!existsSync(filepath)) {
      return res.status(404).json({
        success: false,
        message: 'Audio file not found',
      });
    }

    const stats = await stat(filepath);
    const fileSize = stats.size;
    const contentType = filename.endsWith('.wav') ? 'audio/wav' : 'audio/webm';

    const range = req.headers.range;
    
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
      });

      const stream = createReadStream(filepath, { start, end });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
      });

      const stream = createReadStream(filepath);
      stream.pipe(res);
    }
  } catch (error) {
    logger.error(`Recording serve error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to serve recording',
    });
  }
});

export default router;
