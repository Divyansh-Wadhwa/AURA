import Groq from 'groq-sdk';
import config from '../config/env.js';
import logger from '../utils/logger.js';

let groqClient = null;

const initializeGroq = () => {
  if (!groqClient && config.groqApiKey) {
    groqClient = new Groq({ apiKey: config.groqApiKey });
  }
  return groqClient;
};

export const generateInterviewerResponse = async (
  conversationHistory,
  systemPrompt
) => {
  try {
    const groq = initializeGroq();

    if (!groq) {
      logger.warn('Groq not configured, using fallback responses');
      return getFallbackResponse(conversationHistory);
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((msg) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
    ];

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.7,
      max_tokens: 300,
      top_p: 1,
    });

    const aiMessage = completion.choices[0]?.message?.content;

    if (!aiMessage) {
      throw new Error('No response from Groq');
    }

    logger.debug(`LLM Response generated: ${aiMessage.substring(0, 50)}...`);
    return aiMessage;
  } catch (error) {
    logger.error(`LLM Service Error: ${error.message}`);
    return getFallbackResponse(conversationHistory);
  }
};

export const generateFeedbackExplanation = async (scores, transcript) => {
  try {
    const groq = initializeGroq();

    if (!groq) {
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

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;

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
    return getDefaultFeedbackExplanation(scores);
  }
};

const getFallbackResponse = (conversationHistory) => {
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
