/**
 * TTS Routes - Text-to-Speech using ElevenLabs
 */
import { Router } from 'express';
import { protect } from '../middleware/auth0.middleware.js';
import config from '../config/env.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * POST /tts/speak
 * Convert text to speech using ElevenLabs
 */
router.post('/speak', protect, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Text is required' });
    }

    if (!config.elevenlabsApiKey) {
      return res.status(503).json({ success: false, message: 'TTS service not configured' });
    }

    const voiceId = config.elevenlabsVoiceId || 'EXAVITQu4vr4xnSDxMaL'; // Default to Sarah
    
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': config.elevenlabsApiKey,
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[TTS] ElevenLabs error: ${response.status} - ${errorText}`);
      return res.status(500).json({ success: false, message: 'TTS generation failed' });
    }

    // Get the audio buffer
    const audioBuffer = await response.arrayBuffer();
    
    // Send audio as response
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.byteLength,
    });
    
    res.send(Buffer.from(audioBuffer));
    
    logger.debug(`[TTS] Generated speech for text: "${text.substring(0, 50)}..."`);
  } catch (error) {
    logger.error(`[TTS] Error: ${error.message}`);
    res.status(500).json({ success: false, message: 'TTS generation failed' });
  }
});

export default router;
