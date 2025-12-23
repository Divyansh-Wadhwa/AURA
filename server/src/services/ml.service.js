import config from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Full ML Analysis Pipeline: Perception → Decision
 * 
 * 1. Extract text from transcript (user responses)
 * 2. Call Perception Layer to extract features
 * 3. Call Decision Layer to score features
 * 4. Generate feedback based on scores and low features
 */
export const analyzeSession = async (sessionData) => {
  try {
    const { transcript, audioRefs, sessionId } = sessionData;

    logger.info(`Starting ML analysis for session: ${sessionId}`);

    // Extract user responses and interviewer questions from transcript
    const userMessages = transcript.filter((m) => m.role === 'user');
    const assistantMessages = transcript.filter((m) => m.role === 'assistant');

    if (userMessages.length === 0) {
      logger.warn('No user messages in transcript, using placeholder');
      return generatePlaceholderAnalysis(transcript);
    }

    const userResponses = userMessages.map((m) => m.content);
    const interviewerQuestions = assistantMessages.map((m) => m.content);

    // Step 1: Call Perception Layer to extract features
    logger.info(`Calling Perception Layer for session: ${sessionId}`);
    const perceptionResult = await callPerceptionLayer(userResponses, interviewerQuestions);

    if (!perceptionResult) {
      logger.warn('Perception Layer failed, using placeholder');
      return generatePlaceholderAnalysis(transcript);
    }

    logger.info(`Perception features extracted for session: ${sessionId}`);

    // Step 2: Call Decision Layer to score features
    logger.info(`Calling Decision Layer for session: ${sessionId}`);
    const decisionResult = await callDecisionLayer(perceptionResult);

    if (!decisionResult) {
      logger.warn('Decision Layer failed, using placeholder');
      return generatePlaceholderAnalysis(transcript);
    }

    logger.info(`ML analysis completed for session: ${sessionId}`);
    logger.info(`Scores: confidence=${decisionResult.confidence}, clarity=${decisionResult.clarity}, empathy=${decisionResult.empathy}, communication=${decisionResult.communication}`);

    // Step 3: Generate feedback based on scores and low features
    const feedback = generateFeedbackFromScores(decisionResult);

    return {
      scores: {
        confidence: decisionResult.confidence,
        clarity: decisionResult.clarity,
        empathy: decisionResult.empathy,
        communication: decisionResult.communication,
        overall: decisionResult.overall,
      },
      feedback,
      features: perceptionResult,
    };
  } catch (error) {
    logger.error(`ML Analysis error: ${error.message}`);
    return generatePlaceholderAnalysis(sessionData.transcript);
  }
};

/**
 * Call Perception Layer to extract features from text
 */
const callPerceptionLayer = async (userResponses, interviewerQuestions) => {
  try {
    // Check if perception service is available
    const healthCheck = await fetch(`${config.perceptionServiceUrl}/health`, {
      method: 'GET',
    }).catch(() => null);

    if (!healthCheck?.ok) {
      logger.warn('Perception service not available');
      return null;
    }

    // Call /analyze/text endpoint
    const response = await fetch(`${config.perceptionServiceUrl}/analyze/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_responses: userResponses,
        interviewer_questions: interviewerQuestions,
        response_durations: null, // We don't have duration data for text-only
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Perception Layer error: ${response.status} - ${errorText}`);
      return null;
    }

    const result = await response.json();
    return result.text_metrics || result.raw_metrics;
  } catch (error) {
    logger.error(`Perception Layer call failed: ${error.message}`);
    return null;
  }
};

/**
 * Call Decision Layer to score features
 */
const callDecisionLayer = async (textMetrics) => {
  try {
    // Check if decision service is available
    const healthCheck = await fetch(`${config.decisionServiceUrl}/health`, {
      method: 'GET',
    }).catch(() => null);

    if (!healthCheck?.ok) {
      logger.warn('Decision service not available');
      return null;
    }

    // Prepare the request with text metrics (audio/video will be null for text-only)
    const scoreRequest = {
      text_metrics: textMetrics,
      audio_metrics: null,
      video_metrics: null,
    };

    const response = await fetch(`${config.decisionServiceUrl}/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(scoreRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Decision Layer error: ${response.status} - ${errorText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    logger.error(`Decision Layer call failed: ${error.message}`);
    return null;
  }
};

/**
 * Generate feedback based on scores and low features
 */
const generateFeedbackFromScores = (decisionResult) => {
  const { confidence, clarity, empathy, communication, low_features = [], improvement_suggestions = [] } = decisionResult;

  const strengths = [];
  const improvements = [];
  const tips = [];

  // Identify strengths (scores >= 70)
  if (confidence >= 70) strengths.push('Demonstrated strong confidence in responses');
  if (clarity >= 70) strengths.push('Clear and well-structured communication');
  if (empathy >= 70) strengths.push('Good emotional intelligence and empathy');
  if (communication >= 70) strengths.push('Effective overall communication skills');

  // Add default strength if none identified
  if (strengths.length === 0) {
    strengths.push('Engaged actively throughout the interview');
    strengths.push('Provided responses to all questions');
  }

  // Use improvement suggestions from decision layer if available
  if (improvement_suggestions.length > 0) {
    improvements.push(...improvement_suggestions.slice(0, 3));
  } else {
    // Generate based on low scores
    if (confidence < 60) improvements.push('Work on projecting more confidence in your responses');
    if (clarity < 60) improvements.push('Focus on structuring responses more clearly');
    if (empathy < 60) improvements.push('Show more understanding of different perspectives');
    if (communication < 60) improvements.push('Enhance overall communication effectiveness');
  }

  // Generate tips based on low features
  const tipMap = {
    'hedge_ratio': 'Reduce hedging phrases like "maybe", "I think", "sort of"',
    'filler_word_ratio': 'Practice reducing filler words like "um", "uh", "like"',
    'assertive_phrase_ratio': 'Use more assertive language to convey confidence',
    'semantic_relevance_mean': 'Stay more focused on the question being asked',
    'topic_drift_ratio': 'Keep responses on-topic and avoid tangents',
    'sentence_length_std': 'Maintain consistent sentence lengths for clarity',
    'empathy_phrase_ratio': 'Include more empathetic acknowledgments in responses',
  };

  for (const feature of low_features.slice(0, 3)) {
    if (tipMap[feature]) {
      tips.push(tipMap[feature]);
    }
  }

  // Add default tips if none generated
  if (tips.length === 0) {
    tips.push('Practice answering common behavioral questions using the STAR method');
    tips.push('Research the company thoroughly before interviews');
    tips.push('Prepare 3-5 questions to ask the interviewer');
  }

  return {
    strengths,
    improvements,
    tips,
    detailedAnalysis: `Analysis based on ${low_features.length} identified areas for improvement.`,
  };
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
