import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    // Auth0 user ID (sub claim from JWT)
    auth0Id: {
      type: String,
      unique: true,
      sparse: true, // Allows null for legacy users
      index: true,
    },
    password: {
      type: String,
      // Not required for Auth0 users
      required: false,
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    avatar: {
      type: String,
      default: null,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    totalSessions: {
      type: Number,
      default: 0,
    },
    averageScore: {
      type: Number,
      default: 0,
    },
    skillProgress: {
      confidence: { type: Number, default: 0 },
      clarity: { type: Number, default: 0 },
      empathy: { type: Number, default: 0 },
      communication: { type: Number, default: 0 },
    },
    // Behavioral profile - baseline from onboarding
    behavioralProfile: {
      // Raw numeric signals (internal only, never exposed)
      metrics: {
        pacing: { type: Number, default: 50 },        // 0-100 scale
        structure: { type: Number, default: 50 },
        hesitation: { type: Number, default: 50 },
        assertiveness: { type: Number, default: 50 },
        clarity: { type: Number, default: 50 },
        warmth: { type: Number, default: 50 },
        energy: { type: Number, default: 50 },
      },
      // Psychological state classification
      disposition: {
        type: String,
        enum: ['cautious', 'anxious', 'neutral', 'confident', 'overconfident'],
        default: 'neutral',
      },
      // Communication style archetype
      styleArchetype: {
        type: String,
        enum: ['thoughtful_analyzer', 'dynamic_engager', 'steady_connector', 'clear_director', 'reflective_explorer'],
        default: null,
      },
      // Human-readable reflection
      reflection: { type: String, default: null },
      // Current focus area (opportunity for growth)
      focusArea: { type: String, default: null },
      focusRationale: { type: String, default: null },
      // Suggested micro-experiment
      microExperiment: { type: String, default: null },
      // Session count for evolution tracking
      sessionCount: { type: Number, default: 0 },
      // Whether baseline is established
      hasBaseline: { type: Boolean, default: false },
      // Last updated timestamp
      lastUpdated: { type: Date, default: null },
    },
    // Onboarding status
    onboardingCompleted: { type: Boolean, default: false },
    onboardingSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function (next) {
  // Skip password hashing if password is not set (Auth0 users)
  if (!this.password || !this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

const User = mongoose.model('User', userSchema);

export default User;
