import Session from '../models/Session.model.js';
import User from '../models/User.model.js';
import { generateInterviewerResponse } from '../services/llm.service.js';
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

    const systemPrompt = getSystemPrompt(scenario, skillFocus);
    const initialMessage = await generateInterviewerResponse([], systemPrompt);

    session.addMessage('system', systemPrompt);
    session.addMessage('assistant', initialMessage);
    await session.save();

    logger.info(`Session started: ${session._id} for user: ${req.user._id}`);

    res.status(201).json({
      success: true,
      data: {
        sessionId: session._id,
        interactionMode: session.interactionMode,
        scenario: session.scenario,
        initialMessage,
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

    res.status(200).json({
      success: true,
      data: {
        response: aiResponse,
        messageCount: session.transcript.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const endSession = async (req, res, next) => {
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

    if (session.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Session already completed',
      });
    }

    session.status = 'analyzing';
    session.endedAt = new Date();
    session.calculateDuration();
    await session.save();

    // Trigger ML analysis asynchronously (will be implemented later)
    triggerMLAnalysis(session._id).catch((err) => {
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

const getSystemPrompt = (scenario, skillFocus) => {
  const scenarioPrompts = {
    'technical-interview': `You are a senior technical interviewer conducting a software engineering interview. 
Ask about technical concepts, problem-solving approaches, and coding practices. 
Be professional but friendly. Ask follow-up questions based on responses.`,
    'behavioral-interview': `You are an HR professional conducting a behavioral interview. 
Use the STAR method (Situation, Task, Action, Result) to explore past experiences.
Ask about teamwork, challenges overcome, and professional growth.`,
    'hr-interview': `You are an HR manager conducting a general HR interview.
Discuss career goals, company fit, salary expectations, and work preferences.
Be warm and professional.`,
    'case-study': `You are a consultant presenting a business case study.
Present a scenario and ask the candidate to analyze and propose solutions.
Challenge their reasoning constructively.`,
    'general-practice': `You are a friendly interview coach helping someone practice their interview skills.
Ask a mix of common interview questions and provide a supportive environment.
Encourage detailed responses.`,
  };

  const focusInstructions = skillFocus.length > 0
    ? `Pay special attention to evaluating: ${skillFocus.join(', ')}.`
    : '';

  return `${scenarioPrompts[scenario] || scenarioPrompts['general-practice']}

${focusInstructions}

Important guidelines:
- Never provide scores or feedback during the interview
- Keep responses concise (2-3 sentences typically)
- Ask one question at a time
- Show active listening by referencing previous answers
- Maintain professional interview atmosphere
- If the candidate seems stuck, provide gentle guidance`;
};

const triggerMLAnalysis = async (sessionId) => {
  // Placeholder for ML service integration
  // Will be implemented when ML service is ready
  logger.info(`ML Analysis triggered for session: ${sessionId}`);
  
  // For now, mark session as completed with placeholder scores
  setTimeout(async () => {
    try {
      const session = await Session.findById(sessionId);
      if (session && session.status === 'analyzing') {
        session.status = 'completed';
        session.scores = {
          confidence: Math.floor(Math.random() * 30) + 60,
          clarity: Math.floor(Math.random() * 30) + 60,
          empathy: Math.floor(Math.random() * 30) + 60,
          communication: Math.floor(Math.random() * 30) + 60,
          overall: Math.floor(Math.random() * 30) + 60,
        };
        session.feedback = {
          strengths: [
            'Good articulation of thoughts',
            'Maintained professional tone',
          ],
          improvements: [
            'Could provide more specific examples',
            'Consider structuring responses better',
          ],
          tips: [
            'Use the STAR method for behavioral questions',
            'Practice active listening cues',
          ],
        };
        await session.save();

        // Update user stats
        const user = await User.findById(session.userId);
        if (user) {
          user.totalSessions += 1;
          const stats = await Session.getUserStats(user._id);
          user.averageScore = stats.averageScore;
          user.skillProgress = stats.skillAverages;
          await user.save();
        }

        logger.info(`Session ${sessionId} analysis completed`);
      }
    } catch (err) {
      logger.error(`Error completing session analysis: ${err.message}`);
    }
  }, 3000);
};
