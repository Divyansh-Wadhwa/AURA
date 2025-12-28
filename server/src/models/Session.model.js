import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  duration: {
    type: Number,
    default: null,
  },
});

const scoreSchema = new mongoose.Schema({
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: null,
  },
  clarity: {
    type: Number,
    min: 0,
    max: 100,
    default: null,
  },
  empathy: {
    type: Number,
    min: 0,
    max: 100,
    default: null,
  },
  communication: {
    type: Number,
    min: 0,
    max: 100,
    default: null,
  },
  overall: {
    type: Number,
    min: 0,
    max: 100,
    default: null,
  },
});

const feedbackSchema = new mongoose.Schema({
  strengths: [String],
  improvements: [String],
  tips: [String],
  detailedAnalysis: {
    type: String,
    default: null,
  },
});

const audioRefSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  path: String,
  size: Number,
  duration: Number,
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

// Timeline event schema for behavioral tracking
const timelineEventSchema = new mongoose.Schema({
  type: String,
  startTime: Number,
  endTime: Number,
  duration: Number,
  severity: String,
  message: String,
}, { _id: false });

const timelineSummarySchema = new mongoose.Schema({
  totalEvents: Number,
  eyeContactIssues: Number,
  visibilityIssues: Number,
  movementIssues: Number,
  postureIssues: Number,
  engagementIssues: Number,
  criticalCount: Number,
  warningCount: Number,
  sessionDuration: Number,
}, { _id: false });

const timelineSchema = new mongoose.Schema({
  events: [timelineEventSchema],
  summary: timelineSummarySchema,
}, { _id: false });

const videoMetricsSchema = new mongoose.Schema({
  video_available: {
    type: Number,
    default: 0,
  },
  face_presence_ratio: {
    type: Number,
    min: 0,
    max: 1,
    default: 0,
  },
  eye_contact_ratio: {
    type: Number,
    min: 0,
    max: 1,
    default: 0,
  },
  head_motion_variance: {
    type: Number,
    default: 0,
  },
  facial_engagement_score: {
    type: Number,
    min: 0,
    max: 1,
    default: 0,
  },
  total_frames: {
    type: Number,
    default: 0,
  },
  // Body language metrics
  body_detected_ratio: {
    type: Number,
    min: 0,
    max: 1,
    default: 0,
  },
  shoulder_openness: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.5,
  },
  gesture_frequency: {
    type: Number,
    default: 0,
  },
  posture_stability: {
    type: Number,
    min: 0,
    max: 1,
    default: 1,
  },
  gesture_amplitude: {
    type: Number,
    min: 0,
    max: 1,
    default: 0,
  },
  // Behavioral timeline
  timeline: timelineSchema,
});

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sessionType: {
      type: String,
      enum: ['interview', 'group-discussion', 'presentation', 'onboarding'],
      default: 'interview',
    },
    interactionMode: {
      type: String,
      enum: ['text-only', 'live'],
      default: 'text-only',
    },
    scenario: {
      type: String,
      enum: [
        'technical-interview',
        'behavioral-interview',
        'hr-interview',
        'case-study',
        'general-practice',
        'onboarding',
        'job_interview',
        'presentation',
        'group_discussion',
        'casual_conversation',
        'custom',
      ],
      default: 'general-practice',
    },
    skillFocus: {
      type: [String],
      enum: ['confidence', 'clarity', 'empathy', 'communication'],
      default: ['confidence', 'clarity'],
    },
    customContext: {
      prompt: String,
      resumeText: String,
      jobDescriptionText: String,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'cancelled', 'analyzing'],
      default: 'pending',
    },
    transcript: [messageSchema],
    audioRefs: [audioRefSchema],
    videoMetrics: videoMetricsSchema,
    scores: scoreSchema,
    feedback: feedbackSchema,
    startedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number,
      default: 0,
    },
    metadata: {
      userAgent: String,
      ipAddress: String,
      deviceType: String,
    },
  },
  {
    timestamps: true,
  }
);

sessionSchema.index({ userId: 1, createdAt: -1 });
sessionSchema.index({ status: 1 });

sessionSchema.methods.calculateDuration = function () {
  if (this.startedAt && this.endedAt) {
    this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
  }
  return this.duration;
};

sessionSchema.methods.addMessage = function (role, content, duration = null) {
  this.transcript.push({
    role,
    content,
    timestamp: new Date(),
    duration: duration,
  });
  return this;
};

sessionSchema.statics.getRecentSessions = function (userId, limit = 10) {
  return this.find({ userId, status: 'completed' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('-transcript -audioRefs');
};

sessionSchema.statics.getUserStats = async function (userId) {
  const sessions = await this.find({ userId, status: 'completed' });
  
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      averageScore: 0,
      skillAverages: {
        confidence: 0,
        clarity: 0,
        empathy: 0,
        communication: 0,
      },
      sessionHistory: [],
    };
  }

  // Filter out sessions with placeholder/fallback scores (all exactly 70) or no transcript
  const validSessions = sessions.filter((s) => {
    const hasScores = s.scores?.overall && s.scores.overall > 0;
    const hasTranscript = s.transcript && s.transcript.length > 1;
    const isNotPlaceholder = !(
      s.scores?.confidence === 70 &&
      s.scores?.clarity === 70 &&
      s.scores?.empathy === 70 &&
      s.scores?.communication === 70
    );
    return hasScores && hasTranscript && isNotPlaceholder;
  });

  const totalSessions = sessions.length;
  const validCount = validSessions.length || 1;
  
  const averageScore =
    validSessions.reduce((sum, s) => sum + (s.scores?.overall || 0), 0) / validCount;

  const skillAverages = {
    confidence:
      validSessions.reduce((sum, s) => sum + (s.scores?.confidence || 0), 0) / validCount,
    clarity:
      validSessions.reduce((sum, s) => sum + (s.scores?.clarity || 0), 0) / validCount,
    empathy:
      validSessions.reduce((sum, s) => sum + (s.scores?.empathy || 0), 0) / validCount,
    communication:
      validSessions.reduce((sum, s) => sum + (s.scores?.communication || 0), 0) / validCount,
  };

  // Session history for session-by-session view (last 10)
  const sessionHistory = validSessions
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10)
    .map((s) => ({
      id: s._id,
      date: s.createdAt,
      scenario: s.scenario,
      duration: s.duration,
      scores: {
        overall: s.scores?.overall || 0,
        confidence: s.scores?.confidence || 0,
        clarity: s.scores?.clarity || 0,
        empathy: s.scores?.empathy || 0,
        communication: s.scores?.communication || 0,
      },
    }));

  return {
    totalSessions,
    validSessions: validSessions.length,
    averageScore: Math.round(averageScore),
    skillAverages: {
      confidence: Math.round(skillAverages.confidence),
      clarity: Math.round(skillAverages.clarity),
      empathy: Math.round(skillAverages.empathy),
      communication: Math.round(skillAverages.communication),
    },
    sessionHistory,
  };
};

const Session = mongoose.model('Session', sessionSchema);

export default Session;
