import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { transcribeAudio, extractAudioFeatures } from './ml.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const UPLOADS_DIR = join(__dirname, '../../uploads/audio');

export const initializeUploadsDir = async () => {
  try {
    if (!existsSync(UPLOADS_DIR)) {
      await mkdir(UPLOADS_DIR, { recursive: true });
      logger.info(`Created uploads directory: ${UPLOADS_DIR}`);
    }
  } catch (error) {
    logger.error(`Failed to create uploads directory: ${error.message}`);
  }
};

export const saveAudioChunk = async (sessionId, audioBuffer, chunkIndex) => {
  try {
    const sessionDir = join(UPLOADS_DIR, sessionId);
    if (!existsSync(sessionDir)) {
      await mkdir(sessionDir, { recursive: true });
    }

    const filename = `chunk_${chunkIndex}_${Date.now()}.webm`;
    const filepath = join(sessionDir, filename);

    await writeFile(filepath, audioBuffer);

    logger.debug(`Saved audio chunk: ${filename} for session: ${sessionId}`);

    return {
      filename,
      path: filepath,
      size: audioBuffer.length,
      chunkIndex,
    };
  } catch (error) {
    logger.error(`Failed to save audio chunk: ${error.message}`);
    throw error;
  }
};

export const saveCompleteAudio = async (sessionId, audioBuffer) => {
  try {
    const sessionDir = join(UPLOADS_DIR, sessionId);
    if (!existsSync(sessionDir)) {
      await mkdir(sessionDir, { recursive: true });
    }

    const filename = `complete_${uuidv4()}.webm`;
    const filepath = join(sessionDir, filename);

    await writeFile(filepath, audioBuffer);

    logger.info(`Saved complete audio: ${filename} for session: ${sessionId}`);

    return {
      filename,
      originalName: filename,
      path: filepath,
      size: audioBuffer.length,
    };
  } catch (error) {
    logger.error(`Failed to save complete audio: ${error.message}`);
    throw error;
  }
};

export const processSessionAudio = async (sessionId, audioRefs) => {
  try {
    logger.info(`Processing audio for session: ${sessionId}`);

    const results = {
      transcripts: [],
      features: [],
      errors: [],
    };

    for (const audioRef of audioRefs) {
      try {
        // Transcribe audio
        const transcript = await transcribeAudio(audioRef.path);
        if (transcript) {
          results.transcripts.push({
            audioRef: audioRef.filename,
            transcript,
          });
        }

        // Extract audio features
        const features = await extractAudioFeatures(audioRef.path);
        if (features) {
          results.features.push({
            audioRef: audioRef.filename,
            features,
          });
        }
      } catch (error) {
        results.errors.push({
          audioRef: audioRef.filename,
          error: error.message,
        });
      }
    }

    logger.info(
      `Audio processing completed for session: ${sessionId}. ` +
        `Transcripts: ${results.transcripts.length}, ` +
        `Features: ${results.features.length}, ` +
        `Errors: ${results.errors.length}`
    );

    return results;
  } catch (error) {
    logger.error(`Session audio processing failed: ${error.message}`);
    throw error;
  }
};

export const combineTranscripts = (transcriptResults) => {
  return transcriptResults
    .sort((a, b) => {
      const indexA = parseInt(a.audioRef.match(/chunk_(\d+)/)?.[1] || '0');
      const indexB = parseInt(b.audioRef.match(/chunk_(\d+)/)?.[1] || '0');
      return indexA - indexB;
    })
    .map((t) => t.transcript)
    .join(' ');
};

export const aggregateAudioFeatures = (featureResults) => {
  if (featureResults.length === 0) {
    return null;
  }

  const aggregated = {
    avgPitch: 0,
    avgEnergy: 0,
    avgSpeechRate: 0,
    totalSilenceRatio: 0,
    pitchVariance: 0,
  };

  featureResults.forEach((result) => {
    const f = result.features;
    aggregated.avgPitch += f.pitch || 0;
    aggregated.avgEnergy += f.energy || 0;
    aggregated.avgSpeechRate += f.speechRate || 0;
    aggregated.totalSilenceRatio += f.silenceRatio || 0;
    aggregated.pitchVariance += f.pitchVariance || 0;
  });

  const count = featureResults.length;
  Object.keys(aggregated).forEach((key) => {
    aggregated[key] = aggregated[key] / count;
  });

  return aggregated;
};

export default {
  initializeUploadsDir,
  saveAudioChunk,
  saveCompleteAudio,
  processSessionAudio,
  combineTranscripts,
  aggregateAudioFeatures,
};
