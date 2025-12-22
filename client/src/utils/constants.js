export const SESSION_TYPES = {
  INTERVIEW: 'interview',
  GROUP_DISCUSSION: 'group-discussion',
  PRESENTATION: 'presentation',
};

export const INTERACTION_MODES = {
  TEXT_ONLY: 'text-only',
  AUDIO_ONLY: 'audio-only',
  AUDIO_VIDEO: 'audio-video',
};

export const SCENARIOS = {
  TECHNICAL_INTERVIEW: 'technical-interview',
  BEHAVIORAL_INTERVIEW: 'behavioral-interview',
  HR_INTERVIEW: 'hr-interview',
  CASE_STUDY: 'case-study',
  GENERAL_PRACTICE: 'general-practice',
};

export const SKILLS = {
  CONFIDENCE: 'confidence',
  CLARITY: 'clarity',
  EMPATHY: 'empathy',
  COMMUNICATION: 'communication',
};

export const SESSION_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ANALYZING: 'analyzing',
};

export const SCENARIO_LABELS = {
  'technical-interview': 'Technical Interview',
  'behavioral-interview': 'Behavioral Interview',
  'hr-interview': 'HR Interview',
  'case-study': 'Case Study',
  'general-practice': 'General Practice',
};

export const SCENARIO_DESCRIPTIONS = {
  'technical-interview': 'Practice technical concepts, problem-solving, and coding discussions',
  'behavioral-interview': 'Use STAR method to discuss past experiences and situations',
  'hr-interview': 'Discuss career goals, company fit, and professional development',
  'case-study': 'Analyze business scenarios and propose strategic solutions',
  'general-practice': 'Mixed questions for overall interview preparation',
};

export const SKILL_LABELS = {
  confidence: 'Confidence',
  clarity: 'Clarity',
  empathy: 'Empathy',
  communication: 'Communication',
};

export const SKILL_DESCRIPTIONS = {
  confidence: 'How confidently you express your thoughts and ideas',
  clarity: 'How clearly and structured your responses are',
  empathy: 'Your emotional intelligence and understanding of others',
  communication: 'Overall effectiveness of your communication',
};

export const INTERACTION_MODE_LABELS = {
  'text-only': 'Text Only',
  'audio-only': 'Audio Only',
  'audio-video': 'Audio & Video',
};

export const INTERACTION_MODE_DESCRIPTIONS = {
  'text-only': 'Chat-based interview practice',
  'audio-only': 'Voice-based interview simulation',
  'audio-video': 'Full video call interview experience',
};

export const SCORE_LEVELS = {
  EXCELLENT: { min: 85, label: 'Excellent', color: 'text-green-400' },
  GOOD: { min: 70, label: 'Good', color: 'text-blue-400' },
  AVERAGE: { min: 50, label: 'Average', color: 'text-yellow-400' },
  NEEDS_WORK: { min: 0, label: 'Needs Work', color: 'text-red-400' },
};

export const getScoreLevel = (score) => {
  if (score >= SCORE_LEVELS.EXCELLENT.min) return SCORE_LEVELS.EXCELLENT;
  if (score >= SCORE_LEVELS.GOOD.min) return SCORE_LEVELS.GOOD;
  if (score >= SCORE_LEVELS.AVERAGE.min) return SCORE_LEVELS.AVERAGE;
  return SCORE_LEVELS.NEEDS_WORK;
};

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    ME: '/auth/me',
    PROFILE: '/auth/profile',
  },
  SESSION: {
    START: '/session/start',
    MESSAGE: (id) => `/session/${id}/message`,
    END: (id) => `/session/${id}/end`,
    GET: (id) => `/session/${id}`,
    LIST: '/session/list',
    STATS: '/session/stats',
  },
  FEEDBACK: {
    GET: (id) => `/feedback/${id}`,
    TRENDS: '/feedback/trends',
    DETAILED: (id) => `/feedback/${id}/detailed`,
  },
};
