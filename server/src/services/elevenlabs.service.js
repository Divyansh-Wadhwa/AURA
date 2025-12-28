import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/env.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const AUDIO_OUTPUT_DIR = join(__dirname, '../../uploads/tts');

let elevenlabsAvailable = false;

const initializeTTSDir = async () => {
  try {
    if (!existsSync(AUDIO_OUTPUT_DIR)) {
      await mkdir(AUDIO_OUTPUT_DIR, { recursive: true });
      logger.info(`Created TTS output directory: ${AUDIO_OUTPUT_DIR}`);
    }
  } catch (error) {
    logger.error(`Failed to create TTS directory: ${error.message}`);
  }
};

const checkElevenLabsAvailability = () => {
  logger.debug(`[ElevenLabs] Checking availability - API key present: ${!!config.elevenlabsApiKey}`);
  if (!config.elevenlabsApiKey) {
    logger.warn('[ElevenLabs] API key not configured - voice responses disabled');
    return false;
  }
  // Voice responses enabled if API key is present
  elevenlabsAvailable = true;
  logger.info(`[ElevenLabs] Service initialized successfully with voice: ${config.elevenlabsVoiceId}`);
  return true;
};

checkElevenLabsAvailability();
initializeTTSDir();

/**
 * Generate speech audio from text using ElevenLabs API
 * @param {string} text - Text to convert to speech
 * @param {string} sessionId - Session ID for organizing audio files
 * @param {Object} options - Optional configuration
 * @returns {Promise<{audioUrl: string, audioPath: string, duration: number} | null>}
 */
export const textToSpeech = async (text, sessionId, options = {}) => {
  // Re-check availability in case config wasn't ready at startup
  if (!elevenlabsAvailable && config.elevenlabsApiKey) {
    elevenlabsAvailable = true;
    logger.info('[ElevenLabs] Service now available (late initialization)');
  }
  
  if (!elevenlabsAvailable) {
    logger.debug('[ElevenLabs] Service not available, skipping TTS');
    return null;
  }

  if (!text || text.trim().length === 0) {
    logger.warn('[ElevenLabs] Empty text provided, skipping TTS');
    return null;
  }

  try {
    const voiceId = options.voiceId || config.elevenlabsVoiceId;
    const modelId = options.modelId || 'eleven_monolingual_v1';
    
    logger.info(`[ElevenLabs] Generating TTS for session ${sessionId}, voice: ${voiceId}, text length: ${text.length}`);
    
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
          model_id: modelId,
          voice_settings: {
            stability: options.stability || 0.2,
            similarity_boost: options.similarityBoost || 0.4,
            style: options.style || 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const audioData = Buffer.from(audioBuffer);

    // Save audio file
    const sessionDir = join(AUDIO_OUTPUT_DIR, sessionId || 'default');
    if (!existsSync(sessionDir)) {
      await mkdir(sessionDir, { recursive: true });
    }

    const filename = `tts_${uuidv4()}.mp3`;
    const filepath = join(sessionDir, filename);
    await writeFile(filepath, audioData);

    // Calculate approximate duration (rough estimate based on text length and typical speech rate)
    const wordsPerMinute = 150;
    const wordCount = text.split(/\s+/).length;
    const estimatedDuration = (wordCount / wordsPerMinute) * 60;

    logger.info(`[ElevenLabs] Generated audio: ${filename} (${audioData.length} bytes)`);

    return {
      audioUrl: `/api/audio/tts/${sessionId || 'default'}/${filename}`,
      audioPath: filepath,
      filename,
      size: audioData.length,
      duration: estimatedDuration,
    };
  } catch (error) {
    logger.error(`[ElevenLabs] TTS error: ${error.message}`);
    return null;
  }
};

/**
 * Generate speech and return as buffer (for streaming)
 * @param {string} text - Text to convert to speech
 * @param {Object} options - Optional configuration
 * @returns {Promise<Buffer | null>}
 */
export const textToSpeechBuffer = async (text, options = {}) => {
  if (!elevenlabsAvailable) {
    return null;
  }

  if (!text || text.trim().length === 0) {
    return null;
  }

  try {
    const voiceId = options.voiceId || config.elevenlabsVoiceId;
    const modelId = options.modelId || 'eleven_monolingual_v1';
    
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
          model_id: modelId,
          voice_settings: {
            stability: options.stability || 0.2,
            similarity_boost: options.similarityBoost || 0.4,
            style: options.style || 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    return Buffer.from(audioBuffer);
  } catch (error) {
    logger.error(`[ElevenLabs] TTS buffer error: ${error.message}`);
    return null;
  }
};

/**
 * Get available voices from ElevenLabs
 * @returns {Promise<Array | null>}
 */
export const getAvailableVoices = async () => {
  if (!config.elevenlabsApiKey) {
    return null;
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': config.elevenlabsApiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.status}`);
    }

    const data = await response.json();
    return data.voices;
  } catch (error) {
    logger.error(`[ElevenLabs] Get voices error: ${error.message}`);
    return null;
  }
};

/**
 * Check if ElevenLabs service is available
 * Re-checks config each time in case it wasn't loaded at startup
 * @returns {boolean}
 */
export const isAvailable = () => {
  // Re-check in case config wasn't ready at startup
  if (!elevenlabsAvailable && config.elevenlabsApiKey) {
    elevenlabsAvailable = true;
    logger.info('[ElevenLabs] Service now available (late initialization)');
  }
  return elevenlabsAvailable;
};

export default {
  textToSpeech,
  textToSpeechBuffer,
  getAvailableVoices,
  isAvailable,
};
