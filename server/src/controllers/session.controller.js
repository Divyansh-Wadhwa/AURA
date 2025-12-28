import Session from '../models/Session.model.js';
import User from '../models/User.model.js';
import { generateInterviewerResponse } from '../services/llm.service.js';
import { analyzeSession } from '../services/ml.service.js';
import { textToSpeech, isAvailable as isTTSAvailable } from '../services/elevenlabs.service.js';
import { transcribeAudio, isAvailable as isSTTAvailable } from '../services/whisper.service.js';
import { getProfileContext, updateBehavioralProfile } from '../services/behavioralProfile.service.js';
import logger from '../utils/logger.js';

export const startSession = async (req, res, next) => {
  try {
    const {
      sessionType = 'interview',
      interactionMode = 'text-only',
      scenario = 'general-practice',
      skillFocus = ['confidence', 'clarity'],
    } = req.body;

    const session = await Session.create({
      userId: req.user._id,
      sessionType,
      interactionMode,
      scenario,
      skillFocus,
      status: 'active',
      startedAt: new Date(),
    });

    // Get behavioral profile context for adaptive AI behavior
    const profileContext = await getProfileContext(req.user._id);
    const systemPrompt = getSystemPrompt(scenario, skillFocus, profileContext);
    const initialMessage = await generateInterviewerResponse([], systemPrompt);

    session.addMessage('system', systemPrompt);
    session.addMessage('assistant', initialMessage);
    await session.save();

    logger.info(`Session started: ${session._id} for user: ${req.user._id}`);

    // Generate TTS audio for initial message if voice is enabled and live mode
    let audioResponse = null;
    if (isTTSAvailable() && interactionMode === 'live') {
      audioResponse = await textToSpeech(initialMessage, session._id.toString());
    }

    res.status(201).json({
      success: true,
      data: {
        sessionId: session._id,
        interactionMode: session.interactionMode,
        scenario: session.scenario,
        initialMessage,
        audio: audioResponse,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message content is required',
      });
    }

    const session = await Session.findOne({
      _id: sessionId,
      userId: req.user._id,
      status: 'active',
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Active session not found',
      });
    }

    session.addMessage('user', message);

    const conversationHistory = session.transcript
      .filter((msg) => msg.role !== 'system')
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

    const systemPrompt = session.transcript.find((msg) => msg.role === 'system')?.content;
    const aiResponse = await generateInterviewerResponse(conversationHistory, systemPrompt);

    session.addMessage('assistant', aiResponse);
    await session.save();

    // Generate TTS audio for AI response if voice is enabled and live mode
    let audioResponse = null;
    const interactionMode = session.interactionMode;
    if (isTTSAvailable() && interactionMode === 'live') {
      audioResponse = await textToSpeech(aiResponse, sessionId);
    }

    res.status(200).json({
      success: true,
      data: {
        response: aiResponse,
        messageCount: session.transcript.length,
        audio: audioResponse,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const sendAudioMessage = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const audioBuffer = req.body.audio;

    if (!audioBuffer) {
      return res.status(400).json({
        success: false,
        message: 'Audio data is required',
      });
    }

    const session = await Session.findOne({
      _id: sessionId,
      userId: req.user._id,
      status: 'active',
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Active session not found',
      });
    }

    // Transcribe audio using Whisper
    if (!isSTTAvailable()) {
      return res.status(503).json({
        success: false,
        message: 'Speech-to-text service not available',
      });
    }

    const buffer = Buffer.from(audioBuffer, 'base64');
    const transcription = await transcribeAudio(buffer, { mimeType: 'audio/webm' });

    if (!transcription || !transcription.text) {
      return res.status(400).json({
        success: false,
        message: 'Failed to transcribe audio',
      });
    }

    const userMessage = transcription.text;
    const audioDuration = transcription.duration || 0;
    logger.info(`[Audio] Transcribed: "${userMessage.substring(0, 50)}..." (duration: ${audioDuration}s)`);

    session.addMessage('user', userMessage, audioDuration);

    const conversationHistory = session.transcript
      .filter((msg) => msg.role !== 'system')
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

    const systemPrompt = session.transcript.find((msg) => msg.role === 'system')?.content;
    const aiResponse = await generateInterviewerResponse(conversationHistory, systemPrompt);

    session.addMessage('assistant', aiResponse);
    await session.save();

    // Generate TTS audio for AI response
    let audioResponse = null;
    if (isTTSAvailable()) {
      audioResponse = await textToSpeech(aiResponse, sessionId);
    }

    res.status(200).json({
      success: true,
      data: {
        transcription: userMessage,
        response: aiResponse,
        messageCount: session.transcript.length,
        audio: audioResponse,
      },
    });
  } catch (error) {
    logger.error(`Audio message error: ${error.message}`);
    next(error);
  }
};

export const endSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { videoMetrics } = req.body || {};

    const session = await Session.findOne({
      _id: sessionId,
      userId: req.user._id,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    if (session.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Session already completed',
      });
    }

    // Store video metrics if provided
    if (videoMetrics) {
      session.videoMetrics = videoMetrics;
      logger.info(`Video metrics received for session ${sessionId}:`, videoMetrics);
    }

    session.status = 'analyzing';
    session.endedAt = new Date();
    session.calculateDuration();
    await session.save();

    // Trigger ML analysis asynchronously (include video metrics)
    triggerMLAnalysis(session._id, videoMetrics).catch((err) => {
      logger.error(`ML Analysis failed for session ${session._id}: ${err.message}`);
    });

    logger.info(`Session ended: ${session._id}, Duration: ${session.duration}s`);

    res.status(200).json({
      success: true,
      data: {
        sessionId: session._id,
        status: session.status,
        duration: session.duration,
        messageCount: session.transcript.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findOne({
      _id: sessionId,
      userId: req.user._id,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserSessions = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = { userId: req.user._id };
    if (status) {
      query.status = status;
    }

    const sessions = await Session.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('-transcript -audioRefs');

    const total = await Session.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        sessions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserStats = async (req, res, next) => {
  try {
    const stats = await Session.getUserStats(req.user._id);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

const getSystemPrompt = (scenario, skillFocus, profileContext = null) => {
  const scenarioPrompts = {
    'technical-interview': `You are a senior technical interviewer at a top tech company conducting a software engineering interview.
Your role is to assess the candidate's technical depth, problem-solving ability, and communication skills.
Ask progressively deeper technical questions based on their responses.`,
    'behavioral-interview': `You are an experienced HR professional conducting a behavioral interview.
Use the STAR method (Situation, Task, Action, Result) to explore past experiences in depth.
Probe for specific details about their actions and measurable outcomes.`,
    'hr-interview': `You are an HR manager conducting a comprehensive HR interview.
Explore career motivations, cultural fit, growth aspirations, and professional values.
Ask insightful questions that reveal the candidate's character and goals.`,
    'case-study': `You are a management consultant presenting business case studies.
Present realistic scenarios and challenge the candidate to analyze problems systematically.
Ask probing questions about their assumptions and methodology.`,
    'general-practice': `You are an experienced interview coach helping someone prepare for job interviews.
Ask a variety of common and challenging interview questions.
Help them practice articulating their experiences clearly.`,
    'job_interview': `You are conducting a realistic job interview for a professional role.
Ask relevant behavioral and situational questions.
Create a supportive but realistic interview experience.`,
    'presentation': `You are an audience member during a presentation practice.
Listen actively and ask clarifying questions.
Provide natural reactions that help the speaker improve.`,
    'group_discussion': `You are a participant in a group discussion.
Engage naturally in collaborative dialogue.
Share perspectives and build on ideas together.`,
    'casual_conversation': `You are having a natural, friendly conversation.
Be warm, curious, and engaging.
Help the person feel comfortable expressing themselves.`,
    'onboarding': `You are a friendly AI coach conducting a brief get-to-know-you conversation.
Ask open-ended, neutral questions to understand the person's natural communication style.
Be warm, encouraging, and non-judgmental. This is NOT an evaluation.`,
  };

  const focusInstructions = skillFocus.length > 0
    ? `Focus areas to assess: ${skillFocus.join(', ')}.`
    : '';

  // Build adaptive context from behavioral profile
  let adaptiveContext = '';
  if (profileContext) {
    const hints = profileContext.adaptationHints || [];
    if (hints.length > 0) {
      adaptiveContext = `
## ADAPTIVE COACHING CONTEXT
This person's communication style: ${profileContext.styleName || 'Natural communicator'}
Current focus area: ${profileContext.currentFocus || 'General improvement'}

Adaptation guidelines for this session:
${hints.map(h => `- ${h}`).join('\n')}

Remember: Adapt your tone, pacing, and question difficulty based on these guidelines.
`;
    }
  }

  return `${scenarioPrompts[scenario] || scenarioPrompts['general-practice']}

${focusInstructions}
${adaptiveContext}
## CRITICAL RULES - FOLLOW EXACTLY:

1. **ALWAYS END WITH A QUESTION**: Every response MUST end with a relevant follow-up question. Never end with just an acknowledgment.

2. **BE SPECIFIC**: Reference specific details from the candidate's answer. Don't give generic responses.

3. **PROGRESS THE INTERVIEW**: Each question should either:
   - Dig deeper into something they mentioned
   - Move to a new relevant topic
   - Challenge or clarify their answer

4. **RESPONSE FORMAT**:
   - Brief acknowledgment (1 sentence, referencing something specific they said)
   - Follow-up question (must be a genuine question ending with ?)

5. **FORBIDDEN**:
   - Generic phrases like "That's great" or "Thanks for sharing" without specifics
   - Ending without a question
   - Repeating the same question
   - Giving scores or feedback

Example good response: "Your experience scaling backend systems at [company they mentioned] sounds challenging. What was the most difficult technical decision you had to make during that project, and how did you approach it?"

Example bad response: "Great, thanks for coming in today. It's good." (NO - this is forbidden)`;
};

const triggerMLAnalysis = async (sessionId, videoMetrics = null) => {
  logger.info(`ML Analysis triggered for session: ${sessionId}`);
  
  try {
    const session = await Session.findById(sessionId);
    if (!session || session.status !== 'analyzing') {
      logger.warn(`Session ${sessionId} not found or not in analyzing state`);
      return;
    }

    // Call the ML service to analyze the session (include video metrics)
    const analysisResult = await analyzeSession({
      sessionId: session._id.toString(),
      transcript: session.transcript,
      audioRefs: session.audioRefs || [],
      videoMetrics: videoMetrics || session.videoMetrics || null,
    });

    // Update session with analysis results
    session.status = 'completed';
    session.scores = {
      confidence: analysisResult.scores.confidence,
      clarity: analysisResult.scores.clarity,
      empathy: analysisResult.scores.empathy,
      communication: analysisResult.scores.communication,
      overall: analysisResult.scores.overall,
    };
    session.feedback = {
      strengths: analysisResult.feedback.strengths,
      improvements: analysisResult.feedback.improvements,
      tips: analysisResult.feedback.tips,
      detailedAnalysis: analysisResult.feedback.detailedAnalysis,
    };
    await session.save();

    // Update user stats
    const user = await User.findById(session.userId);
    if (user) {
      user.totalSessions = (user.totalSessions || 0) + 1;
      const stats = await Session.getUserStats(user._id);
      user.averageScore = stats.averageScore;
      user.skillProgress = stats.skillAverages;
      await user.save();
    }

    // Update behavioral profile with new session analysis
    const isOnboarding = session.scenario === 'onboarding';
    try {
      await updateBehavioralProfile(session.userId, analysisResult.scores, isOnboarding);
      logger.info(`[BehavioralProfile] Updated for user ${session.userId} after session ${sessionId}`);
    } catch (profileErr) {
      logger.error(`[BehavioralProfile] Error updating: ${profileErr.message}`);
    }

    logger.info(`Session ${sessionId} analysis completed`);
  } catch (err) {
    logger.error(`Error completing session analysis: ${err.message}`);
    
    // Mark session as completed with error state if ML fails
    try {
      const session = await Session.findById(sessionId);
      if (session && session.status === 'analyzing') {
        session.status = 'completed';
        session.scores = {
          confidence: 70,
          clarity: 70,
          empathy: 70,
          communication: 70,
          overall: 70,
        };
        session.feedback = {
          strengths: ['Completed the interview session'],
          improvements: ['Analysis service temporarily unavailable'],
          tips: ['Try again later for detailed feedback'],
        };
        await session.save();
      }
    } catch (saveErr) {
      logger.error(`Error saving fallback session: ${saveErr.message}`);
    }
  }
};
