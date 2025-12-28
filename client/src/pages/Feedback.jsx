/**
 * Feedback Page - Narrative Debrief (No Scores)
 * 
 * Presents session feedback as a conversational narrative
 * focusing on growth and encouragement rather than evaluation.
 */
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Sparkles,
  ArrowLeft,
  AlertCircle,
  Lightbulb,
  Clock,
  RefreshCw,
  Loader2,
  MessageCircle,
  Star,
  FlaskConical,
  ArrowRight,
  CheckCircle,
  Heart,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Brain,
  Mic,
  Eye,
  TrendingUp,
} from 'lucide-react';
import { formatDuration, formatDateTime } from '../utils/formatters';
import { SCENARIO_LABELS } from '../utils/constants';

const Feedback = () => {
  const { sessionId } = useParams();
  const { getFeedback } = useSession();
  const { accessToken } = useAuth();
  const { isDarkMode } = useTheme();
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showInsights, setShowInsights] = useState(false);

  const loadFeedback = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await getFeedback(sessionId);

      if (result.success) {
        if (result.data.status === 'analyzing') {
          setIsAnalyzing(true);
          setTimeout(loadFeedback, 3000);
        } else {
          setFeedback(result.data);
          setIsAnalyzing(false);
        }
      } else {
        setError(result.error || 'Failed to load feedback');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wait for access token before making API calls
    if (!accessToken) return;
    loadFeedback();
  }, [sessionId, accessToken]);

  // Generate narrative debrief from session data
  const getDebrief = () => {
    if (!feedback) return null;
    
    const feedbackData = feedback?.feedback || {};
    const strengths = feedbackData.strengths || [];
    const improvements = feedbackData.improvements || [];
    const tips = feedbackData.tips || [];
    
    return {
      opening: 'Nice work completing that session! Here\'s what I noticed...',
      standoutMoments: strengths.slice(0, 3).map(s => ({
        type: 'strength',
        description: s,
      })),
      socialLanding: strengths.length > 0 
        ? 'Your responses showed genuine engagement and thoughtfulness.'
        : 'You showed up and practiced - that\'s the foundation of growth.',
      growthObservation: improvements.length > 0 
        ? `Something to explore: ${improvements[0]}`
        : 'Each conversation is a chance to notice what works well for you.',
      nextExperiment: tips.length > 0 
        ? tips[0] 
        : 'Try one small thing differently in your next conversation.',
      closing: 'See you in the next session!',
    };
  };

  if (loading && !isAnalyzing) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Gathering your insights...</p>
        </div>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center max-w-md">
          <div className={`w-20 h-20 rounded-full ${isDarkMode ? 'bg-primary-900/50' : 'bg-primary-100'} flex items-center justify-center mx-auto mb-6`}>
            <RefreshCw className="w-10 h-10 text-primary-600 animate-spin" />
          </div>
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Reflecting on Your Session</h2>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-6`}>
            Taking a moment to understand what happened in our conversation...
          </p>
          <div className={`flex items-center justify-center gap-2 text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
            Gathering insights
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center max-w-md">
          <div className={`w-16 h-16 rounded-full ${isDarkMode ? 'bg-red-900/50' : 'bg-red-100'} flex items-center justify-center mx-auto mb-4`}>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Unable to Load Reflection</h2>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-6`}>{error}</p>
          <div className="flex items-center justify-center gap-4">
            <button onClick={loadFeedback} className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors">
              Try Again
            </button>
            <Link to="/dashboard" className={`px-4 py-2 border ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} rounded-lg font-medium transition-colors`}>
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { duration, scenario, completedAt } = feedback || {};
  const debrief = getDebrief();

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              to="/dashboard"
              className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'} transition-colors`}
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-secondary-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>AURA</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Session Info */}
        <div className="mb-6 flex items-center gap-4 text-sm">
          <span className={`px-3 py-1 rounded-full ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
            {SCENARIO_LABELS[scenario] || scenario?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Practice Session'}
          </span>
          <span className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <Clock className="w-4 h-4" />
            {formatDuration(duration || 0)}
          </span>
        </div>

        {/* Opening / Greeting */}
        <div className={`rounded-2xl ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border shadow-sm overflow-hidden mb-6`}>
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                  {debrief?.opening}
                </h1>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm`}>
                  {formatDateTime(completedAt)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Standout Moments */}
        {debrief?.standoutMoments && debrief.standoutMoments.length > 0 && (
          <div className={`rounded-2xl ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border shadow-sm overflow-hidden mb-6`}>
            <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <h2 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
                <Star className="w-5 h-5 text-yellow-500" />
                Moments that stood out
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {debrief.standoutMoments.map((moment, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 ${isDarkMode ? 'text-primary-400' : 'text-primary-500'} mt-0.5 flex-shrink-0`} />
                  <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                    {moment.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Social Landing Insight */}
        <div className={`rounded-2xl ${isDarkMode ? 'bg-primary-900/30 border-primary-800' : 'bg-primary-50 border-primary-100'} border p-6 mb-6`}>
          <div className="flex items-start gap-4">
            <Lightbulb className={`w-6 h-6 ${isDarkMode ? 'text-primary-400' : 'text-primary-600'} mt-0.5 flex-shrink-0`} />
            <div>
              <h3 className={`font-medium ${isDarkMode ? 'text-primary-300' : 'text-primary-800'} mb-1`}>
                How it landed
              </h3>
              <p className={isDarkMode ? 'text-primary-200' : 'text-primary-700'}>
                {debrief?.socialLanding}
              </p>
            </div>
          </div>
        </div>

        {/* Growth Observation */}
        {debrief?.growthObservation && (
          <div className={`rounded-2xl ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border shadow-sm p-6 mb-6`}>
            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              {debrief.growthObservation}
            </p>
          </div>
        )}

        {/* Next Micro-Experiment */}
        <div className={`rounded-2xl ${isDarkMode ? 'bg-secondary-900/30 border-secondary-800' : 'bg-secondary-50 border-secondary-100'} border p-6 mb-6`}>
          <div className="flex items-start gap-4">
            <FlaskConical className={`w-6 h-6 ${isDarkMode ? 'text-secondary-400' : 'text-secondary-600'} mt-0.5 flex-shrink-0`} />
            <div>
              <h3 className={`font-medium ${isDarkMode ? 'text-secondary-300' : 'text-secondary-800'} mb-1`}>
                Try this next time
              </h3>
              <p className={isDarkMode ? 'text-secondary-200' : 'text-secondary-700'}>
                {debrief?.nextExperiment}
              </p>
            </div>
          </div>
        </div>

        {/* View Insights Toggle */}
        <button
          onClick={() => setShowInsights(!showInsights)}
          className={`w-full rounded-2xl ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white border-gray-200 hover:bg-gray-50'} border shadow-sm p-4 mb-6 flex items-center justify-between transition-colors`}
        >
          <div className="flex items-center gap-3">
            <BarChart3 className={`w-5 h-5 ${isDarkMode ? 'text-primary-400' : 'text-primary-600'}`} />
            <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              View Detailed Insights
            </span>
          </div>
          {showInsights ? (
            <ChevronUp className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          ) : (
            <ChevronDown className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          )}
        </button>

        {/* Detailed Insights Panel */}
        {showInsights && feedback?.scores && (
          <div className={`rounded-2xl ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border shadow-sm overflow-hidden mb-8`}>
            <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <h2 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
                <Brain className="w-5 h-5 text-primary-500" />
                AI Analysis Metrics
              </h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                Scores from NLP & Decision Layer analysis
              </p>
            </div>
            
            <div className="p-6">
              {/* Score Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Confidence */}
                <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className={`w-4 h-4 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Confidence</span>
                  </div>
                  <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {feedback.scores.confidence || 0}%
                  </div>
                  <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${feedback.scores.confidence || 0}%` }}
                    />
                  </div>
                </div>

                {/* Clarity */}
                <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className={`w-4 h-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Clarity</span>
                  </div>
                  <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {feedback.scores.clarity || 0}%
                  </div>
                  <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${feedback.scores.clarity || 0}%` }}
                    />
                  </div>
                </div>

                {/* Communication */}
                <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Mic className={`w-4 h-4 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Communication</span>
                  </div>
                  <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {feedback.scores.communication || 0}%
                  </div>
                  <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 rounded-full transition-all"
                      style={{ width: `${feedback.scores.communication || 0}%` }}
                    />
                  </div>
                </div>

                {/* Empathy */}
                <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className={`w-4 h-4 ${isDarkMode ? 'text-pink-400' : 'text-pink-600'}`} />
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Empathy</span>
                  </div>
                  <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {feedback.scores.empathy || 0}%
                  </div>
                  <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-pink-500 rounded-full transition-all"
                      style={{ width: `${feedback.scores.empathy || 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Overall Score */}
              <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-primary-900/30' : 'bg-primary-50'} mb-6`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-primary-300' : 'text-primary-700'}`}>Overall Score</span>
                    <div className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {feedback.scores.overall || 0}%
                    </div>
                  </div>
                  <div className={`w-16 h-16 rounded-full ${isDarkMode ? 'bg-primary-800' : 'bg-primary-100'} flex items-center justify-center`}>
                    <BarChart3 className={`w-8 h-8 ${isDarkMode ? 'text-primary-300' : 'text-primary-600'}`} />
                  </div>
                </div>
              </div>

              {/* Improvement Areas */}
              {feedback?.feedback?.improvements && feedback.feedback.improvements.length > 0 && (
                <div>
                  <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-3 flex items-center gap-2`}>
                    <Lightbulb className="w-4 h-4 text-yellow-500" />
                    Areas for Improvement
                  </h3>
                  <div className="space-y-2">
                    {feedback.feedback.improvements.map((item, i) => (
                      <div key={i} className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'} text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Closing Message */}
        <div className={`text-center mb-8`}>
          <Heart className={`w-8 h-8 mx-auto mb-3 ${isDarkMode ? 'text-pink-400' : 'text-pink-500'}`} />
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>{debrief?.closing}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            to="/session/setup" 
            className="w-full sm:w-auto px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
          >
            Practice Again
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link 
            to="/dashboard" 
            className={`w-full sm:w-auto px-6 py-3 border ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} rounded-xl font-medium transition-colors text-center`}
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Feedback;
