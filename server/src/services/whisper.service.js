import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { existsSync, createReadStream } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import Groq from 'groq-sdk';
import config from '../config/env.js';
import logger from '../utils/logger.js';
const TEMP_DIR = join(process.cwd(), 'uploads', 'temp');
const SUPPORTED_FORMATS = ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm'];

let whisperAvailable = false;
let ffmpegAvailable = false;

const initializeTempDir = async () => {
  try {
    if (!existsSync(TEMP_DIR)) {
      await mkdir(TEMP_DIR, { recursive: true });
      logger.info(`Created temp directory: ${TEMP_DIR}`);
    }
  } catch (error) {
    logger.error(`Failed to create temp directory: ${error.message}`);
  }
};

let groqClient = null;

const checkWhisperAvailability = () => {
  if (!config.groqApiKey) {
    logger.warn('[Whisper] Groq API key not configured - STT disabled');
    logger.warn('[Whisper] Get a free API key from: https://console.groq.com/');
    return false;
  }
  try {
    groqClient = new Groq({ apiKey: config.groqApiKey });
    whisperAvailable = true;
    logger.info('[Whisper] Service initialized successfully via Groq');
    return true;
  } catch (error) {
    logger.error(`[Whisper] Failed to initialize Groq client: ${error.message}`);
    return false;
  }
};

const checkFFmpegAvailability = () => {
  return new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', ['-version']);
    ffmpeg.on('error', () => {
      logger.warn('[FFmpeg] Not available - WebM conversion disabled, will try direct upload');
      ffmpegAvailable = false;
      resolve(false);
    });
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        ffmpegAvailable = true;
        logger.info('[FFmpeg] Available for audio conversion');
        resolve(true);
      } else {
        ffmpegAvailable = false;
        resolve(false);
      }
    });
  });
};

// Initialize
initializeTempDir();
checkWhisperAvailability();
checkFFmpegAvailability();

/**
 * Convert WebM audio to WAV format using FFmpeg
 * @param {Buffer} webmBuffer - WebM audio buffer
 * @returns {Promise<{wavPath: string, wavBuffer: Buffer} | null>}
 */
export const convertWebmToWav = async (webmBuffer) => {
  if (!ffmpegAvailable) {
    logger.debug('[FFmpeg] Not available, returning original buffer');
    return null;
  }

  const inputPath = join(TEMP_DIR, `input_${uuidv4()}.webm`);
  const outputPath = join(TEMP_DIR, `output_${uuidv4()}.wav`);

  try {
    // Write WebM to temp file
    await writeFile(inputPath, webmBuffer);

    // Convert using FFmpeg
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', inputPath,
        '-acodec', 'pcm_s16le',
        '-ar', '16000',
        '-ac', '1',
        '-y',
        outputPath
      ]);

      let stderr = '';
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg spawn error: ${error.message}`));
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
        }
      });
    });

    // Read converted WAV
    const wavBuffer = await readFile(outputPath);

    // Cleanup temp files
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});

    logger.debug(`[FFmpeg] Converted WebM to WAV (${wavBuffer.length} bytes)`);
    return { wavPath: outputPath, wavBuffer };
  } catch (error) {
    logger.error(`[FFmpeg] Conversion error: ${error.message}`);
    // Cleanup on error
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
    return null;
  }
};

/**
 * Transcribe audio using OpenAI Whisper API
 * @param {Buffer} audioBuffer - Audio buffer (WAV or WebM)
 * @param {Object} options - Optional configuration
 * @returns {Promise<{text: string, language: string, duration: number} | null>}
 */
export const transcribeAudio = async (audioBuffer, options = {}) => {
  if (!whisperAvailable) {
    logger.debug('[Whisper] Service not available, skipping transcription');
    return null;
  }

  if (!audioBuffer || audioBuffer.length === 0) {
    logger.warn('[Whisper] Empty audio buffer provided');
    return null;
  }

  try {
    // Try to convert WebM to WAV if FFmpeg is available
    let finalBuffer = audioBuffer;
    let mimeType = options.mimeType || 'audio/webm';
    let filename = options.filename || 'audio.webm';

    if (ffmpegAvailable && mimeType.includes('webm')) {
      const converted = await convertWebmToWav(audioBuffer);
      if (converted) {
        finalBuffer = converted.wavBuffer;
        mimeType = 'audio/wav';
        filename = 'audio.wav';
      }
    }

    // Save buffer to temp file for Groq API
    const tempFilePath = join(TEMP_DIR, `whisper_${uuidv4()}.${mimeType.includes('wav') ? 'wav' : 'webm'}`);
    await writeFile(tempFilePath, finalBuffer);

    logger.info(`[Whisper] Sending request to Groq (buffer size: ${finalBuffer.length} bytes, mime: ${mimeType})`);

    try {
      // Use Groq's Whisper API
      const transcription = await groqClient.audio.transcriptions.create({
        file: createReadStream(tempFilePath),
        model: 'whisper-large-v3',
        response_format: 'verbose_json',
        language: options.language || undefined,
        prompt: options.prompt || undefined,
      });

      // Clean up temp file
      await unlink(tempFilePath).catch(() => {});

      logger.info(`[Whisper] Transcription successful: "${transcription.text?.substring(0, 100)}..."`);

      return {
        text: transcription.text || '',
        language: transcription.language || 'en',
        duration: transcription.duration || 0,
        segments: transcription.segments || [],
      };
    } catch (apiError) {
      // Clean up temp file on error
      await unlink(tempFilePath).catch(() => {});
      throw apiError;
    }
  } catch (error) {
    logger.error(`[Whisper] Transcription error: ${error.message}`);
    return null;
  }
};

/**
 * Transcribe audio from file path
 * @param {string} filePath - Path to audio file
 * @param {Object} options - Optional configuration
 * @returns {Promise<{text: string, language: string, duration: number} | null>}
 */
export const transcribeAudioFile = async (filePath, options = {}) => {
  if (!whisperAvailable) {
    return null;
  }

  try {
    const audioBuffer = await readFile(filePath);
    const mimeType = filePath.endsWith('.wav') ? 'audio/wav' : 
                     filePath.endsWith('.mp3') ? 'audio/mpeg' : 'audio/webm';
    const filename = filePath.split('/').pop();

    return transcribeAudio(audioBuffer, { ...options, mimeType, filename });
  } catch (error) {
    logger.error(`[Whisper] File transcription error: ${error.message}`);
    return null;
  }
};

/**
 * Check if Whisper service is available
 * @returns {boolean}
 */
export const isAvailable = () => whisperAvailable;

/**
 * Check if FFmpeg is available for conversion
 * @returns {boolean}
 */
export const isFFmpegAvailable = () => ffmpegAvailable;

export default {
  convertWebmToWav,
  transcribeAudio,
  transcribeAudioFile,
  isAvailable,
  isFFmpegAvailable,
};
