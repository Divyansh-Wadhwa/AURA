/**
 * Behavioral Profile Service
 * 
 * Handles extraction, classification, and management of user behavioral profiles.
 * All numeric metrics remain internal - only human-readable reflections are exposed.
 */
import User from '../models/User.model.js';
import logger from '../utils/logger.js';

/**
 * Communication Style Archetypes
 */
const STYLE_ARCHETYPES = {
  thoughtful_analyzer: {
    name: 'Thoughtful Analyzer',
    description: 'You approach conversations with care and consideration, taking time to formulate well-structured responses.',
    traits: ['deliberate', 'thorough', 'precise'],
  },
  dynamic_engager: {
    name: 'Dynamic Engager',
    description: 'You bring energy and spontaneity to conversations, thinking on your feet and adapting quickly.',
    traits: ['energetic', 'adaptive', 'expressive'],
  },
  steady_connector: {
    name: 'Steady Connector',
    description: 'You create a sense of calm and reliability in conversations, making others feel heard and valued.',
    traits: ['grounded', 'empathetic', 'reliable'],
  },
  clear_director: {
    name: 'Clear Director',
    description: 'You communicate with purpose and clarity, getting to the point efficiently with confidence.',
    traits: ['direct', 'organized', 'confident'],
  },
  reflective_explorer: {
    name: 'Reflective Explorer',
    description: 'You approach conversations with curiosity, exploring ideas from multiple angles.',
    traits: ['curious', 'open-minded', 'inquisitive'],
  },
};

/**
 * Disposition-based feedback strategies
 */
const DISPOSITION_STRATEGIES = {
  cautious: {
    tone: 'warm',
    showNumbers: false,
    emphasis: ['reassurance', 'encouragement', 'small_wins'],
    language: 'supportive',
  },
  anxious: {
    tone: 'gentle',
    showNumbers: false,
    emphasis: ['normalization', 'progress', 'safety'],
    language: 'calming',
  },
  neutral: {
    tone: 'balanced',
    showNumbers: false,
    emphasis: ['insights', 'patterns', 'growth'],
    language: 'descriptive',
  },
  confident: {
    tone: 'direct',
    showNumbers: false,
    emphasis: ['challenges', 'refinement', 'mastery'],
    language: 'collaborative',
  },
  overconfident: {
    tone: 'grounded',
    showNumbers: true, // Light quantitative indicators
    emphasis: ['comparison', 'blind_spots', 'specifics'],
    language: 'constructive',
  },
};

/**
 * Focus area suggestions by dimension
 */
const FOCUS_SUGGESTIONS = {
  pacing: {
    low: {
      focus: 'Finding your rhythm',
      rationale: 'Experimenting with varied pacing can help your message land more dynamically.',
      experiment: 'Try pausing for a breath after making an important point.',
    },
    high: {
      focus: 'Creating space for impact',
      rationale: 'Your natural energy is an asset. Strategic pauses can let key points resonate.',
      experiment: 'Before your next key point, take a silent breath.',
    },
  },
  structure: {
    low: {
      focus: 'Building narrative flow',
      rationale: 'Your conversational style feels natural. Light structure can help ideas connect.',
      experiment: 'Try the "one thing" approach - identify your single most important point.',
    },
    high: {
      focus: 'Adding spontaneous moments',
      rationale: 'Your organized approach is a strength. Occasional spontaneity adds authenticity.',
      experiment: 'Share a brief personal anecdote that comes to mind.',
    },
  },
  hesitation: {
    low: {
      focus: 'Embracing the pause',
      rationale: 'Your fluid delivery is impressive. Strategic hesitation signals thoughtfulness.',
      experiment: 'Practice saying "Let me think about that" before complex questions.',
    },
    high: {
      focus: 'Building verbal flow',
      rationale: 'Taking time to think shows care. Smooth transitions help clarity shine.',
      experiment: 'Replace filler words with a brief silent pause.',
    },
  },
  assertiveness: {
    low: {
      focus: 'Owning your perspective',
      rationale: 'Your thoughtful approach is valuable. Assertive language can amplify impact.',
      experiment: 'Start one response with "I believe..." or "In my experience..."',
    },
    high: {
      focus: 'Inviting dialogue',
      rationale: 'Your confidence is evident. Inviting others in creates collaboration.',
      experiment: 'End a statement with "What do you think?" to open dialogue.',
    },
  },
  clarity: {
    low: {
      focus: 'Sharpening the message',
      rationale: 'Your ideas have depth. Clearer framing helps others follow along.',
      experiment: 'Before responding, mentally identify your main point.',
    },
    high: {
      focus: 'Adding texture',
      rationale: 'Your clarity is a strength. Adding nuance can enrich communication.',
      experiment: 'Include a brief example or story to illustrate your point.',
    },
  },
};

/**
 * Classify psychological disposition from behavioral metrics
 */
export const classifyDisposition = (metrics) => {
  const { hesitation, assertiveness, energy, warmth } = metrics;
  
  // Calculate composite scores
  const confidenceScore = (assertiveness + energy) / 2;
  const anxietyIndicator = hesitation;
  const groundingScore = (100 - assertiveness + warmth) / 2;
  
  if (anxietyIndicator > 70 && confidenceScore < 40) {
    return 'anxious';
  }
  if (hesitation > 60 && assertiveness < 45) {
    return 'cautious';
  }
  if (assertiveness > 75 && hesitation < 30) {
    return 'overconfident';
  }
  if (confidenceScore > 60 && hesitation < 45) {
    return 'confident';
  }
  return 'neutral';
};

/**
 * Determine communication style archetype from metrics
 */
export const determineStyleArchetype = (metrics) => {
  const { pacing, structure, hesitation, assertiveness, clarity, warmth, energy } = metrics;
  
  // Thoughtful Analyzer: high structure, moderate hesitation, high clarity
  if (structure > 60 && clarity > 55 && pacing < 55) {
    return 'thoughtful_analyzer';
  }
  
  // Dynamic Engager: high energy, low hesitation, high pacing
  if (energy > 60 && hesitation < 45 && pacing > 55) {
    return 'dynamic_engager';
  }
  
  // Steady Connector: high warmth, moderate everything else
  if (warmth > 60 && Math.abs(assertiveness - 50) < 20) {
    return 'steady_connector';
  }
  
  // Clear Director: high assertiveness, high clarity, high structure
  if (assertiveness > 60 && clarity > 55 && structure > 50) {
    return 'clear_director';
  }
  
  // Reflective Explorer: moderate hesitation (thinking), varied structure
  return 'reflective_explorer';
};

/**
 * Generate human-readable reflection from metrics and archetype
 */
export const generateReflection = (metrics, archetype, disposition, sessionCount = 0) => {
  const style = STYLE_ARCHETYPES[archetype];
  const strategy = DISPOSITION_STRATEGIES[disposition];
  
  if (!style) {
    return 'You have a natural and authentic communication style.';
  }
  
  let reflection = style.description;
  
  // Add progression context if multiple sessions
  if (sessionCount > 1) {
    const progressPhrases = {
      cautious: 'Each conversation is helping you build confidence.',
      anxious: 'You\'re making great progress just by showing up.',
      neutral: 'Your style is evolving naturally with practice.',
      confident: 'You continue to refine your already strong skills.',
      overconfident: 'Continued practice helps sharpen your edge.',
    };
    reflection += ' ' + (progressPhrases[disposition] || '');
  }
  
  return reflection;
};

/**
 * Select the most relevant focus area based on metrics
 */
export const selectFocusArea = (metrics, disposition) => {
  // Find the dimension with most room for growth (furthest from 50)
  const dimensions = ['pacing', 'structure', 'hesitation', 'assertiveness', 'clarity'];
  
  let selectedDimension = 'clarity';
  let maxDeviation = 0;
  
  dimensions.forEach(dim => {
    const value = metrics[dim] || 50;
    const deviation = Math.abs(value - 50);
    if (deviation > maxDeviation) {
      maxDeviation = deviation;
      selectedDimension = dim;
    }
  });
  
  const value = metrics[selectedDimension] || 50;
  const level = value < 50 ? 'low' : 'high';
  
  const suggestion = FOCUS_SUGGESTIONS[selectedDimension]?.[level] || {
    focus: 'Continued practice',
    rationale: 'Every conversation is an opportunity to grow.',
    experiment: 'Try one thing differently in your next conversation.',
  };
  
  return {
    focusArea: suggestion.focus,
    focusRationale: suggestion.rationale,
    microExperiment: suggestion.experiment,
  };
};

/**
 * Extract behavioral metrics from session analysis
 * This uses existing perception layer data without modification
 */
export const extractMetricsFromAnalysis = (analysis) => {
  if (!analysis) {
    return null;
  }
  
  // Map perception layer outputs to behavioral metrics
  // These values come from existing NLP/audio analysis
  const metrics = {
    pacing: normalizeMetric(analysis.speechRate || analysis.wordsPerMinute, 80, 180, true),
    structure: normalizeMetric(analysis.coherenceScore || analysis.structure, 0, 100),
    hesitation: normalizeMetric(analysis.fillerWordRatio || analysis.hesitation, 0, 0.3, true),
    assertiveness: normalizeMetric(analysis.assertivenessScore || analysis.confidence, 0, 100),
    clarity: normalizeMetric(analysis.clarityScore || analysis.clarity, 0, 100),
    warmth: normalizeMetric(analysis.warmthScore || analysis.empathy || 50, 0, 100),
    energy: normalizeMetric(analysis.energyLevel || analysis.enthusiasm || 50, 0, 100),
  };
  
  return metrics;
};

/**
 * Normalize a metric to 0-100 scale
 */
const normalizeMetric = (value, min, max, inverse = false) => {
  if (value === undefined || value === null) return 50;
  
  let normalized = ((value - min) / (max - min)) * 100;
  normalized = Math.max(0, Math.min(100, normalized));
  
  return inverse ? 100 - normalized : normalized;
};

/**
 * Update user's behavioral profile after a session
 */
export const updateBehavioralProfile = async (userId, sessionAnalysis, isOnboarding = false) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    const newMetrics = extractMetricsFromAnalysis(sessionAnalysis);
    if (!newMetrics) {
      logger.warn('[BehavioralProfile] No metrics extracted from analysis');
      return user.behavioralProfile;
    }
    
    const currentProfile = user.behavioralProfile || {};
    const currentMetrics = currentProfile.metrics || {};
    const sessionCount = (currentProfile.sessionCount || 0) + 1;
    
    // Blend new metrics with existing (weighted average)
    // For onboarding, use new metrics directly; otherwise blend
    const weight = isOnboarding ? 1.0 : 0.3;
    const blendedMetrics = {};
    
    Object.keys(newMetrics).forEach(key => {
      const oldValue = currentMetrics[key] || 50;
      const newValue = newMetrics[key];
      blendedMetrics[key] = Math.round(oldValue * (1 - weight) + newValue * weight);
    });
    
    // Classify disposition and archetype
    const disposition = classifyDisposition(blendedMetrics);
    const styleArchetype = determineStyleArchetype(blendedMetrics);
    
    // Generate reflection and focus area
    const reflection = generateReflection(blendedMetrics, styleArchetype, disposition, sessionCount);
    const { focusArea, focusRationale, microExperiment } = selectFocusArea(blendedMetrics, disposition);
    
    // Update user profile
    user.behavioralProfile = {
      metrics: blendedMetrics,
      disposition,
      styleArchetype,
      reflection,
      focusArea,
      focusRationale,
      microExperiment,
      sessionCount,
      hasBaseline: true,
      lastUpdated: new Date(),
    };
    
    if (isOnboarding) {
      user.onboardingCompleted = true;
    }
    
    await user.save();
    
    logger.info(`[BehavioralProfile] Updated profile for user ${userId}: ${styleArchetype} / ${disposition}`);
    
    return user.behavioralProfile;
  } catch (error) {
    logger.error(`[BehavioralProfile] Error updating profile: ${error.message}`);
    throw error;
  }
};

/**
 * Get user's behavioral profile for dashboard display
 * Returns only human-readable content, never raw metrics
 */
export const getProfileForDisplay = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.behavioralProfile) {
      return {
        hasBaseline: false,
        style: null,
        reflection: 'Complete a conversation to discover your communication style.',
        focusArea: null,
        focusRationale: null,
        microExperiment: null,
        sessionCount: 0,
      };
    }
    
    const profile = user.behavioralProfile;
    const archetype = STYLE_ARCHETYPES[profile.styleArchetype];
    
    return {
      hasBaseline: profile.hasBaseline || false,
      style: archetype?.name || null,
      styleTraits: archetype?.traits || [],
      disposition: profile.disposition, // Used internally for adaptive UI
      reflection: profile.reflection || 'You have a natural and authentic communication style.',
      focusArea: profile.focusArea,
      focusRationale: profile.focusRationale,
      microExperiment: profile.microExperiment,
      sessionCount: profile.sessionCount || 0,
      lastUpdated: profile.lastUpdated,
    };
  } catch (error) {
    logger.error(`[BehavioralProfile] Error getting profile: ${error.message}`);
    throw error;
  }
};

/**
 * Get feedback strategy based on user disposition
 */
export const getFeedbackStrategy = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.behavioralProfile) {
      return DISPOSITION_STRATEGIES.neutral;
    }
    
    const disposition = user.behavioralProfile.disposition || 'neutral';
    return DISPOSITION_STRATEGIES[disposition] || DISPOSITION_STRATEGIES.neutral;
  } catch (error) {
    logger.error(`[BehavioralProfile] Error getting feedback strategy: ${error.message}`);
    return DISPOSITION_STRATEGIES.neutral;
  }
};

/**
 * Get profile context for injection into sessions
 */
export const getProfileContext = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.behavioralProfile?.hasBaseline) {
      return null;
    }
    
    const profile = user.behavioralProfile;
    const archetype = STYLE_ARCHETYPES[profile.styleArchetype];
    
    // Return context for AI to adapt its behavior
    return {
      styleArchetype: profile.styleArchetype,
      styleName: archetype?.name,
      styleTraits: archetype?.traits || [],
      disposition: profile.disposition,
      currentFocus: profile.focusArea,
      sessionCount: profile.sessionCount,
      // Adaptive hints for AI
      adaptationHints: getAdaptationHints(profile.disposition, profile.styleArchetype),
    };
  } catch (error) {
    logger.error(`[BehavioralProfile] Error getting profile context: ${error.message}`);
    return null;
  }
};

/**
 * Generate adaptation hints for AI based on disposition and style
 */
const getAdaptationHints = (disposition, styleArchetype) => {
  const hints = [];
  
  // Disposition-based hints
  switch (disposition) {
    case 'anxious':
      hints.push('Use a warm, encouraging tone');
      hints.push('Provide reassurance and normalization');
      hints.push('Avoid challenging questions early');
      break;
    case 'cautious':
      hints.push('Build trust gradually');
      hints.push('Acknowledge their thoughtfulness');
      hints.push('Give space for reflection');
      break;
    case 'confident':
      hints.push('Match their energy level');
      hints.push('Introduce moderate challenges');
      hints.push('Provide specific refinement suggestions');
      break;
    case 'overconfident':
      hints.push('Use direct, grounded feedback');
      hints.push('Introduce specific scenarios that test assumptions');
      hints.push('Provide concrete comparisons when appropriate');
      break;
    default:
      hints.push('Maintain balanced, supportive tone');
  }
  
  // Style-based hints
  switch (styleArchetype) {
    case 'thoughtful_analyzer':
      hints.push('Allow time for structured responses');
      break;
    case 'dynamic_engager':
      hints.push('Keep pace with their energy');
      break;
    case 'steady_connector':
      hints.push('Emphasize relational aspects');
      break;
    case 'clear_director':
      hints.push('Be direct and efficient');
      break;
    case 'reflective_explorer':
      hints.push('Encourage exploration of ideas');
      break;
  }
  
  return hints;
};

export default {
  classifyDisposition,
  determineStyleArchetype,
  generateReflection,
  selectFocusArea,
  extractMetricsFromAnalysis,
  updateBehavioralProfile,
  getProfileForDisplay,
  getFeedbackStrategy,
  getProfileContext,
};
