import OpenAI from 'openai';
import config from '../config/env.js';
import logger from '../utils/logger.js';

let openrouterClient = null;

const initializeOpenRouter = () => {
  if (!openrouterClient && config.openrouterApiKey) {
    openrouterClient = new OpenAI({
      apiKey: config.openrouterApiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://aura-interview.app',
        'X-Title': 'AURA Interview System',
      },
    });
  }
  return openrouterClient;
};

/**
 * Extract text from OpenAI-compatible response
 * Handles OpenRouter responses using standard OpenAI format
 * 
 * @param {Object} response - OpenAI-compatible API response
 * @returns {string|null} Extracted text or null if not found
 */
const extractOpenRouterText = (response) => {
  try {
    // OpenAI-compatible format: response.choices[0].message.content
    if (!response || !response.choices || !response.choices.length) {
      logger.error('OpenRouter returned no choices');
      return null;
    }

    const content = response.choices[0]?.message?.content;
    if (!content || !content.trim()) {
      logger.error('OpenRouter response missing content');
      return null;
    }

    return content.trim();
  } catch (error) {
    logger.error('Error extracting text from OpenRouter response:', error.message);
    return null;
  }
};

export const generateInterviewerResponse = async (
  conversationHistory,
  systemPrompt
) => {
  try {
    const client = initializeOpenRouter();

    if (!client) {
      logger.warn('OpenRouter not configured, using fallback responses');
      return getFallbackResponse(conversationHistory);
    }

    // Check if this is the first interaction (no user messages yet)
    const hasUserMessage = conversationHistory.some(msg => msg.role === 'user');
    
    if (!hasUserMessage) {
      // Session start: Return opening question WITHOUT calling OpenRouter
      // This message is for UI display only and won't be in LLM history
      logger.debug('Session start: Returning opening question without API call');
      return getFallbackResponse(conversationHistory);
    }

    // Build OpenAI-compatible message history
    // Find the index of the first user message
    const firstUserIndex = conversationHistory.findIndex(msg => msg.role === 'user');
    
    // Filter history to start from first user message onward
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory
        .slice(firstUserIndex)
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))
    ];
    
    // Debug: Log history construction
    logger.debug(`Building OpenRouter history with ${messages.length} messages`);
    logger.debug(`First message role: ${messages[0].role}`);
    
    // Defensive validation: Ensure last message has content
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage?.content?.trim()) {
      logger.error('Last user message is empty or invalid');
      throw new Error('Last user message is empty');
    }
    
    // Debug: Log the request
    logger.debug(`Sending message to OpenRouter: ${lastMessage.content.substring(0, 100)}...`);
    
    const response = await client.chat.completions.create({
      model: config.openrouterInterviewModel,
      messages,
      temperature: 0.7,
      max_tokens: 300,
      top_p: 1,
    });
    
    // Debug: Log response structure and metadata
    logger.debug('OpenRouter raw response:', JSON.stringify(response, null, 2));
    logger.debug('OpenRouter usage:', response?.usage);
    
    // Use OpenAI-compatible text extraction
    const aiMessage = extractOpenRouterText(response);
    
    if (!aiMessage) {
      logger.error('OpenRouter response missing usable text content');
      logger.error('Response structure:', JSON.stringify(response, null, 2));
      throw new Error('OpenRouter response missing usable text content');
    }

    logger.debug(`LLM Response generated: ${aiMessage.substring(0, 50)}...`);
    return aiMessage;
  } catch (error) {
    logger.error(`LLM Service Error: ${error.message}`);
    logger.error('Error stack:', error.stack);
    logger.warn('Falling back to predefined responses');
    return getFallbackResponse(conversationHistory);
  }
};

export const generateFeedbackExplanation = async (scores, transcript) => {
  try {
    const client = initializeOpenRouter();

    if (!client) {
      return getDefaultFeedbackExplanation(scores);
    }

    const prompt = `Based on these interview scores and conversation, provide brief, actionable feedback:

Scores:
- Confidence: ${scores.confidence}/100
- Clarity: ${scores.clarity}/100
- Empathy: ${scores.empathy}/100
- Communication: ${scores.communication}/100
- Overall: ${scores.overall}/100

Provide 2-3 specific strengths, 2-3 areas for improvement, and 2-3 actionable tips.
Format as JSON with keys: strengths (array), improvements (array), tips (array)`;

    const response = await client.chat.completions.create({
      model: config.openrouterFeedbackModel,
      messages: [
        { role: 'system', content: 'You are a helpful interview feedback assistant. Always respond with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });
    
    // Debug: Log response structure and metadata
    logger.debug('OpenRouter feedback raw response:', JSON.stringify(response, null, 2));
    logger.debug('OpenRouter usage:', response?.usage);
    
    // Use OpenAI-compatible text extraction
    const content = extractOpenRouterText(response);
    
    if (!content) {
      logger.error('OpenRouter response missing usable text content');
      logger.error('Response structure:', JSON.stringify(response, null, 2));
      throw new Error('OpenRouter response missing usable text content');
    }

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(content);
    } catch {
      return getDefaultFeedbackExplanation(scores);
    }
  } catch (error) {
    logger.error(`Feedback generation error: ${error.message}`);
    logger.error('Error stack:', error.stack);
    logger.warn('Falling back to default feedback');
    return getDefaultFeedbackExplanation(scores);
  }
};

const getFallbackResponse = (conversationHistory) => {
  // Count assistant messages to determine which fallback question to use
  const questionCount = conversationHistory.filter(
    (m) => m.role === 'assistant'
  ).length;

  const fallbackQuestions = [
    "Hello! I'm excited to conduct this interview with you today. Could you start by telling me a bit about yourself and what brings you here?",
    "That's interesting. Can you tell me about a challenging project you've worked on recently? What was your role and what did you learn from it?",
    "Great example. How do you typically approach problem-solving when you encounter an obstacle you haven't faced before?",
    "I see. Can you describe a situation where you had to work with a difficult team member? How did you handle it?",
    "Thank you for sharing that. What would you say are your greatest strengths, and how have they helped you in your career?",
    "Interesting perspective. Where do you see yourself professionally in the next few years?",
    "Good to know. Is there anything specific you'd like to know about the role or any questions you have for me?",
    "Thank you for your thoughtful responses throughout this interview. We've covered a lot of ground today. Is there anything else you'd like to add before we wrap up?",
  ];

  return fallbackQuestions[Math.min(questionCount, fallbackQuestions.length - 1)];
};

const getDefaultFeedbackExplanation = (scores) => {
  const strengths = [];
  const improvements = [];
  const tips = [];

  if (scores.confidence >= 70) {
    strengths.push('Demonstrated good confidence in responses');
  } else {
    improvements.push('Work on projecting more confidence');
    tips.push('Practice power poses before interviews to boost confidence');
  }

  if (scores.clarity >= 70) {
    strengths.push('Clear and articulate communication');
  } else {
    improvements.push('Focus on structuring responses more clearly');
    tips.push('Use the STAR method to organize behavioral responses');
  }

  if (scores.empathy >= 70) {
    strengths.push('Good emotional intelligence and empathy');
  } else {
    improvements.push('Show more understanding of different perspectives');
    tips.push('Practice active listening and acknowledge others viewpoints');
  }

  if (scores.communication >= 70) {
    strengths.push('Effective overall communication skills');
  } else {
    improvements.push('Enhance overall communication effectiveness');
    tips.push('Record yourself answering questions and review for improvement');
  }

  return { strengths, improvements, tips };
};

export default {
  generateInterviewerResponse,
  generateFeedbackExplanation,
};
