import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_change_in_production',
  jwtExpiresIn: '7d',
  
  // Auth0 Configuration
  auth0Domain: process.env.AUTH0_DOMAIN,
  auth0Audience: process.env.AUTH0_AUDIENCE || 'https://my-api',
  
  openrouterApiKey: process.env.OPENROUTER_API_KEY,
  // Use google/gemini-2.0-flash-001 (fast, follows instructions, no reasoning overhead)
  openrouterInterviewModel: process.env.OPENROUTER_INTERVIEW_MODEL || 'google/gemini-2.0-flash-001',
  openrouterFeedbackModel: process.env.OPENROUTER_FEEDBACK_MODEL || 'google/gemini-2.0-flash-001',
  // Perception Layer - extracts features from text/audio/video
  perceptionServiceUrl: process.env.PERCEPTION_SERVICE_URL || 'http://localhost:5001',
  // Decision Layer - scores features using ML models
  decisionServiceUrl: process.env.DECISION_SERVICE_URL || 'http://localhost:8000',
  // Legacy alias (for backward compatibility)
  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://localhost:8000',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  // ElevenLabs TTS Configuration
  elevenlabsApiKey: process.env.ELEVENLABS_API_KEY?.trim(),
  elevenlabsVoiceId: process.env.ELEVENLABS_VOICE_ID?.trim() || 'EXAVITQu4vr4xnSDxMaL',
  enableVoiceResponses: process.env.ENABLE_VOICE_RESPONSES === 'true',
  groqApiKey: process.env.GROQ_API_KEY,
};

export default config;
