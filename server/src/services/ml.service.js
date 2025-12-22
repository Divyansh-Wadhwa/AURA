import config from '../config/env.js';
import logger from '../utils/logger.js';

export const analyzeSession = async (sessionData) => {
  try {
    const { transcript, audioRefs, sessionId } = sessionData;

    logger.info(`Starting ML analysis for session: ${sessionId}`);

    // Check if ML service is available
    const mlServiceAvailable = await checkMLServiceHealth();

    if (!mlServiceAvailable) {
      logger.warn('ML Service unavailable, using placeholder analysis');
      return generatePlaceholderAnalysis(transcript);
    }

    // Prepare data for ML service
    const analysisPayload = {
      session_id: sessionId,
      transcript: transcript.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      })),
      audio_refs: audioRefs.map((ref) => ref.path),
    };

    const response = await fetch(`${config.mlServiceUrl}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(analysisPayload),
    });

    if (!response.ok) {
      throw new Error(`ML Service returned ${response.status}`);
    }

    const result = await response.json();

    logger.info(`ML analysis completed for session: ${sessionId}`);

    return {
      scores: {
        confidence: result.scores.confidence,
        clarity: result.scores.clarity,
        empathy: result.scores.empathy,
        communication: result.scores.communication,
        overall: result.scores.overall,
      },
      feedback: {
        strengths: result.feedback.strengths,
        improvements: result.feedback.improvements,
        tips: result.feedback.tips,
        detailedAnalysis: result.feedback.detailed_analysis,
      },
      features: result.features,
    };
  } catch (error) {
    logger.error(`ML Analysis error: ${error.message}`);
    return generatePlaceholderAnalysis(sessionData.transcript);
  }
};

export const extractAudioFeatures = async (audioPath) => {
  try {
    const response = await fetch(`${config.mlServiceUrl}/extract-audio-features`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ audio_path: audioPath }),
    });

    if (!response.ok) {
      throw new Error(`Audio feature extraction failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    logger.error(`Audio feature extraction error: ${error.message}`);
    return null;
  }
};

export const transcribeAudio = async (audioPath) => {
  try {
    const response = await fetch(`${config.mlServiceUrl}/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ audio_path: audioPath }),
    });

    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.status}`);
    }

    const result = await response.json();
    return result.transcript;
  } catch (error) {
    logger.error(`Transcription error: ${error.message}`);
    return null;
  }
};

const checkMLServiceHealth = async () => {
  try {
    const response = await fetch(`${config.mlServiceUrl}/health`, {
      method: 'GET',
      timeout: 5000,
    });
    return response.ok;
  } catch {
    return false;
  }
};

const generatePlaceholderAnalysis = (transcript) => {
  const userMessages = transcript.filter((m) => m.role === 'user');
  const messageCount = userMessages.length;

  // Simple heuristics for placeholder scores
  const avgLength =
    userMessages.length > 0
      ? userMessages.reduce((sum, m) => sum + m.content.length, 0) / userMessages.length
      : 0;

  const baseScore = 65;
  const lengthBonus = Math.min(15, avgLength / 20);
  const countBonus = Math.min(10, messageCount * 2);

  const confidence = Math.round(baseScore + lengthBonus + Math.random() * 10);
  const clarity = Math.round(baseScore + lengthBonus + Math.random() * 10);
  const empathy = Math.round(baseScore + countBonus + Math.random() * 10);
  const communication = Math.round(baseScore + lengthBonus + countBonus / 2 + Math.random() * 10);
  const overall = Math.round((confidence + clarity + empathy + communication) / 4);

  return {
    scores: {
      confidence: Math.min(95, confidence),
      clarity: Math.min(95, clarity),
      empathy: Math.min(95, empathy),
      communication: Math.min(95, communication),
      overall: Math.min(95, overall),
    },
    feedback: {
      strengths: [
        'Engaged actively throughout the interview',
        'Provided relevant responses to questions',
        'Maintained professional communication',
      ],
      improvements: [
        'Consider providing more specific examples',
        'Structure responses using the STAR method',
        'Expand on technical details when relevant',
      ],
      tips: [
        'Practice answering common behavioral questions',
        'Research the company thoroughly before interviews',
        'Prepare 3-5 questions to ask the interviewer',
      ],
      detailedAnalysis: null,
    },
    features: null,
  };
};

export default {
  analyzeSession,
  extractAudioFeatures,
  transcribeAudio,
};
