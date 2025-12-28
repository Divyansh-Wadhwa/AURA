import config from '../config/env.js';
import logger from '../utils/logger.js';

// ANSI color codes for terminal output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
};

const logSection = (title) => {
  console.log(`\n${COLORS.cyan}${'═'.repeat(70)}${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}  ${title}${COLORS.reset}`);
  console.log(`${COLORS.cyan}${'═'.repeat(70)}${COLORS.reset}\n`);
};

const logStep = (step, message) => {
  console.log(`${COLORS.green}[STEP ${step}]${COLORS.reset} ${message}`);
};

const logData = (label, data) => {
  console.log(`${COLORS.yellow}  → ${label}:${COLORS.reset}`, typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
};

const logError = (message) => {
  console.log(`${COLORS.red}[ERROR]${COLORS.reset} ${message}`);
};

const logSuccess = (message) => {
  console.log(`${COLORS.green}[SUCCESS]${COLORS.reset} ${message}`);
};

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
    const { transcript, audioRefs, sessionId, videoMetrics } = sessionData;

    logSection(`ML ANALYSIS PIPELINE - Session: ${sessionId}`);
    logger.info(`Starting ML analysis for session: ${sessionId}`);
    
    // Log video metrics if available
    if (videoMetrics) {
      console.log(`${COLORS.cyan}  Video metrics available:${COLORS.reset}`);
      console.log(`    Face presence: ${(videoMetrics.face_presence_ratio * 100).toFixed(1)}%`);
      console.log(`    Eye contact: ${(videoMetrics.eye_contact_ratio * 100).toFixed(1)}%`);
      console.log(`    Frames analyzed: ${videoMetrics.total_frames}`);
    } else {
      console.log(`${COLORS.yellow}  No video metrics (text-only mode)${COLORS.reset}`);
    }

    // Extract user responses and interviewer questions from transcript
    const userMessages = transcript.filter((m) => m.role === 'user');
    const assistantMessages = transcript.filter((m) => m.role === 'assistant');

    logStep(1, 'Extracting transcript data');
    logData('User messages count', userMessages.length);
    logData('Assistant messages count', assistantMessages.length);

    if (userMessages.length === 0) {
      logError('No user messages in transcript, using placeholder');
      logger.warn('No user messages in transcript, using placeholder');
      return generatePlaceholderAnalysis(transcript);
    }

    const userResponses = userMessages.map((m) => m.content);
    const interviewerQuestions = assistantMessages.map((m) => m.content);
    const responseDurations = userMessages.map((m) => m.duration || 0);

    console.log(`\n${COLORS.magenta}  User Responses:${COLORS.reset}`);
    userResponses.forEach((r, i) => console.log(`    [${i + 1}] "${r.substring(0, 100)}${r.length > 100 ? '...' : ''}" (${responseDurations[i]}s)`));

    // Step 2: Call Perception Layer to extract features
    logStep(2, `Calling Perception Layer at ${config.perceptionServiceUrl}`);
    const perceptionResult = await callPerceptionLayer(userResponses, interviewerQuestions, responseDurations);

    if (!perceptionResult) {
      logError('Perception Layer failed - falling back to placeholder');
      logger.warn('Perception Layer failed, using placeholder');
      return generatePlaceholderAnalysis(transcript);
    }

    logSuccess('Perception features extracted successfully');
    console.log(`\n${COLORS.blue}  Extracted Features (${Object.keys(perceptionResult).length} text metrics):${COLORS.reset}`);
    Object.entries(perceptionResult).forEach(([key, value]) => {
      console.log(`    ${COLORS.yellow}${key}:${COLORS.reset} ${typeof value === 'number' ? value.toFixed(4) : value}`);
    });

    // Log video metrics in detail
    if (videoMetrics) {
      console.log(`\n${COLORS.magenta}  Video Features (${Object.keys(videoMetrics).length} metrics):${COLORS.reset}`);
      Object.entries(videoMetrics).forEach(([key, value]) => {
        console.log(`    ${COLORS.cyan}${key}:${COLORS.reset} ${typeof value === 'number' ? value.toFixed(4) : value}`);
      });
    }

    // Log audio metrics if available
    if (audioRefs && audioRefs.length > 0) {
      console.log(`\n${COLORS.green}  Audio Features:${COLORS.reset}`);
      console.log(`    ${COLORS.cyan}audio_segments:${COLORS.reset} ${audioRefs.length}`);
      const totalDuration = audioRefs.reduce((sum, ref) => sum + (ref.duration || 0), 0);
      console.log(`    ${COLORS.cyan}total_audio_duration:${COLORS.reset} ${totalDuration.toFixed(2)}s`);
    }

    // Step 3: Call Decision Layer to score features (include video metrics)
    logStep(3, `Calling Decision Layer at ${config.decisionServiceUrl}`);
    const decisionResult = await callDecisionLayer(perceptionResult, videoMetrics);

    if (!decisionResult) {
      logError('Decision Layer failed - falling back to placeholder');
      logger.warn('Decision Layer failed, using placeholder');
      return generatePlaceholderAnalysis(transcript);
    }

    logSuccess('Decision Layer scoring completed');
    console.log(`\n${COLORS.green}  ╔═══════════════════════════════════════╗${COLORS.reset}`);
    console.log(`${COLORS.green}  ║        ML MODEL SCORES                ║${COLORS.reset}`);
    console.log(`${COLORS.green}  ╠═══════════════════════════════════════╣${COLORS.reset}`);
    console.log(`${COLORS.green}  ║  Confidence:    ${String(decisionResult.confidence).padStart(3)}                  ║${COLORS.reset}`);
    console.log(`${COLORS.green}  ║  Clarity:       ${String(decisionResult.clarity).padStart(3)}                  ║${COLORS.reset}`);
    console.log(`${COLORS.green}  ║  Empathy:       ${String(decisionResult.empathy).padStart(3)}                  ║${COLORS.reset}`);
    console.log(`${COLORS.green}  ║  Communication: ${String(decisionResult.communication).padStart(3)}                  ║${COLORS.reset}`);
    console.log(`${COLORS.green}  ║  Overall:       ${String(decisionResult.overall).padStart(3)}                  ║${COLORS.reset}`);
    console.log(`${COLORS.green}  ╚═══════════════════════════════════════╝${COLORS.reset}`);

    if (decisionResult.low_features && decisionResult.low_features.length > 0) {
      console.log(`\n${COLORS.yellow}  Low Features Identified:${COLORS.reset}`);
      decisionResult.low_features.forEach(f => console.log(`    - ${f}`));
    }

    logger.info(`ML analysis completed for session: ${sessionId}`);
    logger.info(`Scores: confidence=${decisionResult.confidence}, clarity=${decisionResult.clarity}, empathy=${decisionResult.empathy}, communication=${decisionResult.communication}`);

    // Step 4: Generate feedback based on scores and low features
    logStep(4, 'Generating feedback from ML scores');
    const feedback = generateFeedbackFromScores(decisionResult);

    console.log(`\n${COLORS.cyan}${'═'.repeat(70)}${COLORS.reset}`);
    console.log(`${COLORS.bright}${COLORS.green}  ✓ ML ANALYSIS COMPLETE - USING REAL ML SCORES${COLORS.reset}`);
    console.log(`${COLORS.cyan}${'═'.repeat(70)}${COLORS.reset}\n`);

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
    logError(`ML Analysis error: ${error.message}`);
    console.log(`${COLORS.red}  Stack: ${error.stack}${COLORS.reset}`);
    logger.error(`ML Analysis error: ${error.message}`);
    return generatePlaceholderAnalysis(sessionData.transcript);
  }
};

/**
 * Call Perception Layer to extract features from text
 */
const callPerceptionLayer = async (userResponses, interviewerQuestions, responseDurations = null) => {
  try {
    console.log(`${COLORS.yellow}  Checking Perception service health...${COLORS.reset}`);
    
    // Check if perception service is available
    const healthCheck = await fetch(`${config.perceptionServiceUrl}/health`, {
      method: 'GET',
    }).catch((err) => {
      console.log(`${COLORS.red}  Health check failed: ${err.message}${COLORS.reset}`);
      return null;
    });

    if (!healthCheck?.ok) {
      console.log(`${COLORS.red}  Perception service not responding at ${config.perceptionServiceUrl}${COLORS.reset}`);
      logger.warn('Perception service not available');
      return null;
    }
    
    console.log(`${COLORS.green}  ✓ Perception service is healthy${COLORS.reset}`);

    // Call /analyze/text endpoint
    const requestBody = {
      user_responses: userResponses,
      interviewer_questions: interviewerQuestions,
      response_durations: responseDurations,
    };
    
    console.log(`${COLORS.yellow}  Sending request to ${config.perceptionServiceUrl}/analyze/text${COLORS.reset}`);
    console.log(`${COLORS.yellow}  Request payload: ${userResponses.length} user responses, ${interviewerQuestions.length} questions${COLORS.reset}`);
    
    const response = await fetch(`${config.perceptionServiceUrl}/analyze/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`${COLORS.red}  Perception API error: ${response.status}${COLORS.reset}`);
      console.log(`${COLORS.red}  Response: ${errorText}${COLORS.reset}`);
      logger.error(`Perception Layer error: ${response.status} - ${errorText}`);
      return null;
    }

    const result = await response.json();
    console.log(`${COLORS.green}  ✓ Received response from Perception Layer${COLORS.reset}`);
    
    // IMPORTANT: Use raw_metrics (not normalized text_metrics) for Decision Layer
    // Decision Layer expects raw values (e.g., avg_sentence_length >= 1)
    // text_metrics are normalized to 0-1 range which causes validation errors
    const metrics = result.raw_metrics || result.text_metrics;
    if (!metrics) {
      console.log(`${COLORS.red}  No metrics in response: ${JSON.stringify(result)}${COLORS.reset}`);
      return null;
    }
    
    console.log(`${COLORS.blue}  Using raw_metrics for Decision Layer (not normalized)${COLORS.reset}`);
    return metrics;
  } catch (error) {
    console.log(`${COLORS.red}  Perception Layer exception: ${error.message}${COLORS.reset}`);
    logger.error(`Perception Layer call failed: ${error.message}`);
    return null;
  }
};

/**
 * Call Decision Layer to score features
 */
const callDecisionLayer = async (textMetrics, videoMetrics = null) => {
  try {
    console.log(`${COLORS.yellow}  Checking Decision service health...${COLORS.reset}`);
    
    // Check if decision service is available
    const healthCheck = await fetch(`${config.decisionServiceUrl}/health`, {
      method: 'GET',
    }).catch((err) => {
      console.log(`${COLORS.red}  Health check failed: ${err.message}${COLORS.reset}`);
      return null;
    });

    if (!healthCheck?.ok) {
      console.log(`${COLORS.red}  Decision service not responding at ${config.decisionServiceUrl}${COLORS.reset}`);
      logger.warn('Decision service not available');
      return null;
    }
    
    console.log(`${COLORS.green}  ✓ Decision service is healthy${COLORS.reset}`);

    // Prepare the request with text metrics and video metrics if available
    const scoreRequest = {
      text_metrics: textMetrics,
      audio_metrics: null,
      video_metrics: videoMetrics || null,
    };

    console.log(`${COLORS.yellow}  Sending features to ${config.decisionServiceUrl}/score${COLORS.reset}`);
    console.log(`${COLORS.yellow}  Feature count: ${Object.keys(textMetrics).length} text metrics${COLORS.reset}`);
    if (videoMetrics) {
      console.log(`${COLORS.cyan}  Video metrics included: face_presence=${videoMetrics.face_presence_ratio?.toFixed(2)}, eye_contact=${videoMetrics.eye_contact_ratio?.toFixed(2)}${COLORS.reset}`);
    }

    const response = await fetch(`${config.decisionServiceUrl}/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(scoreRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`${COLORS.red}  Decision API error: ${response.status}${COLORS.reset}`);
      console.log(`${COLORS.red}  Response: ${errorText}${COLORS.reset}`);
      logger.error(`Decision Layer error: ${response.status} - ${errorText}`);
      return null;
    }

    const result = await response.json();
    console.log(`${COLORS.green}  ✓ Received scores from Decision Layer${COLORS.reset}`);
    
    return result;
  } catch (error) {
    console.log(`${COLORS.red}  Decision Layer exception: ${error.message}${COLORS.reset}`);
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
