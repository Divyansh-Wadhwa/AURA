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
      enum: ['interview', 'group-discussion', 'presentation'],
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
      ],
      default: 'general-practice',
    },
    skillFocus: {
      type: [String],
      enum: ['confidence', 'clarity', 'empathy', 'communication'],
      default: ['confidence', 'clarity'],
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
    };
  }

  const validSessions = sessions.filter((s) => s.scores?.overall);
  const totalSessions = sessions.length;
  
  const averageScore =
    validSessions.reduce((sum, s) => sum + (s.scores?.overall || 0), 0) /
    (validSessions.length || 1);

  const skillAverages = {
    confidence:
      validSessions.reduce((sum, s) => sum + (s.scores?.confidence || 0), 0) /
      (validSessions.length || 1),
    clarity:
      validSessions.reduce((sum, s) => sum + (s.scores?.clarity || 0), 0) /
      (validSessions.length || 1),
    empathy:
      validSessions.reduce((sum, s) => sum + (s.scores?.empathy || 0), 0) /
      (validSessions.length || 1),
    communication:
      validSessions.reduce((sum, s) => sum + (s.scores?.communication || 0), 0) /
      (validSessions.length || 1),
  };

  return {
    totalSessions,
    averageScore: Math.round(averageScore),
    skillAverages: {
      confidence: Math.round(skillAverages.confidence),
      clarity: Math.round(skillAverages.clarity),
      empathy: Math.round(skillAverages.empathy),
      communication: Math.round(skillAverages.communication),
    },
  };
};

const Session = mongoose.model('Session', sessionSchema);

export default Session;
