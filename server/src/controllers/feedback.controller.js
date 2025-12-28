import Session from '../models/Session.model.js';
import logger from '../utils/logger.js';

export const getSessionFeedback = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findOne({
      _id: sessionId,
      userId: req.user._id,
    }).select('scores feedback status duration scenario skillFocus createdAt videoMetrics');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    if (session.status === 'analyzing') {
      return res.status(202).json({
        success: true,
        message: 'Analysis in progress',
        data: {
          status: 'analyzing',
        },
      });
    }

    if (session.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Session has not been completed',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        sessionId: session._id,
        scores: session.scores,
        feedback: session.feedback,
        duration: session.duration,
        scenario: session.scenario,
        skillFocus: session.skillFocus,
        completedAt: session.createdAt,
        videoMetrics: session.videoMetrics || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProgressTrends = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const sessions = await Session.find({
      userId: req.user._id,
      status: 'completed',
      createdAt: { $gte: startDate },
    })
      .sort({ createdAt: 1 })
      .select('scores createdAt scenario');

    const trends = sessions.map((session) => ({
      date: session.createdAt,
      scenario: session.scenario,
      scores: session.scores,
    }));

    const skillProgress = calculateSkillProgress(sessions);

    res.status(200).json({
      success: true,
      data: {
        trends,
        skillProgress,
        totalSessions: sessions.length,
        period: `${days} days`,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getDetailedAnalysis = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findOne({
      _id: sessionId,
      userId: req.user._id,
      status: 'completed',
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Completed session not found',
      });
    }

    const messageStats = analyzeMessages(session.transcript);
    const responsePatterns = analyzeResponsePatterns(session.transcript);

    res.status(200).json({
      success: true,
      data: {
        sessionId: session._id,
        scores: session.scores,
        feedback: session.feedback,
        messageStats,
        responsePatterns,
        duration: session.duration,
        scenario: session.scenario,
      },
    });
  } catch (error) {
    next(error);
  }
};

const calculateSkillProgress = (sessions) => {
  if (sessions.length < 2) {
    return {
      confidence: { change: 0, trend: 'neutral' },
      clarity: { change: 0, trend: 'neutral' },
      empathy: { change: 0, trend: 'neutral' },
      communication: { change: 0, trend: 'neutral' },
    };
  }

  const recentHalf = sessions.slice(Math.floor(sessions.length / 2));
  const olderHalf = sessions.slice(0, Math.floor(sessions.length / 2));

  const calculateAverage = (arr, skill) => {
    const valid = arr.filter((s) => s.scores?.[skill]);
    return valid.length > 0
      ? valid.reduce((sum, s) => sum + s.scores[skill], 0) / valid.length
      : 0;
  };

  const skills = ['confidence', 'clarity', 'empathy', 'communication'];
  const progress = {};

  skills.forEach((skill) => {
    const recentAvg = calculateAverage(recentHalf, skill);
    const olderAvg = calculateAverage(olderHalf, skill);
    const change = recentAvg - olderAvg;

    progress[skill] = {
      change: Math.round(change),
      trend: change > 2 ? 'improving' : change < -2 ? 'declining' : 'stable',
      recent: Math.round(recentAvg),
      previous: Math.round(olderAvg),
    };
  });

  return progress;
};

const analyzeMessages = (transcript) => {
  const userMessages = transcript.filter((m) => m.role === 'user');
  const assistantMessages = transcript.filter((m) => m.role === 'assistant');

  const avgUserLength =
    userMessages.length > 0
      ? Math.round(
          userMessages.reduce((sum, m) => sum + m.content.length, 0) /
            userMessages.length
        )
      : 0;

  const avgAssistantLength =
    assistantMessages.length > 0
      ? Math.round(
          assistantMessages.reduce((sum, m) => sum + m.content.length, 0) /
            assistantMessages.length
        )
      : 0;

  return {
    totalMessages: transcript.length - 1, // Exclude system message
    userMessages: userMessages.length,
    assistantMessages: assistantMessages.length,
    avgUserResponseLength: avgUserLength,
    avgAssistantResponseLength: avgAssistantLength,
    responseRatio:
      assistantMessages.length > 0
        ? (userMessages.length / assistantMessages.length).toFixed(2)
        : 0,
  };
};

const analyzeResponsePatterns = (transcript) => {
  const userMessages = transcript.filter((m) => m.role === 'user');

  let shortResponses = 0;
  let mediumResponses = 0;
  let longResponses = 0;

  userMessages.forEach((m) => {
    const wordCount = m.content.split(/\s+/).length;
    if (wordCount < 20) shortResponses++;
    else if (wordCount < 50) mediumResponses++;
    else longResponses++;
  });

  return {
    shortResponses,
    mediumResponses,
    longResponses,
    recommendation:
      shortResponses > mediumResponses + longResponses
        ? 'Consider providing more detailed responses'
        : longResponses > shortResponses + mediumResponses
        ? 'Good detail level, consider being more concise when appropriate'
        : 'Good balance of response lengths',
  };
};
