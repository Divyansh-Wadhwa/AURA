import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Clock,
  BarChart3,
  RefreshCw,
  Loader2,
  Share2,
  Download,
} from 'lucide-react';
import ScoreCard from '../components/Feedback/ScoreCard';
import FeatureBreakdown from '../components/Feedback/FeatureBreakdown';
import ImprovementTips from '../components/Feedback/ImprovementTips';
import { formatDuration, formatDateTime } from '../utils/formatters';
import { SCENARIO_LABELS, getScoreLevel } from '../utils/constants';

const Feedback = () => {
  const { sessionId } = useParams();
  const { getFeedback } = useSession();
  const { accessToken } = useAuth();
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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

  if (loading && !isAnalyzing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading feedback...</p>
        </div>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-6">
            <RefreshCw className="w-10 h-10 text-primary-600 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyzing Your Session</h2>
          <p className="text-gray-500 mb-6">
            Our ML models are evaluating your practice session. This usually takes a few seconds...
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
            Processing transcript and audio features
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Feedback</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <div className="flex items-center justify-center gap-4">
            <button onClick={loadFeedback} className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors">
              Try Again
            </button>
            <Link to="/dashboard" className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { scores, feedback: feedbackData, duration, scenario, completedAt } = feedback || {};
  const overallLevel = getScoreLevel(scores?.overall || 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-secondary-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">AURA</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Session Feedback</h1>
              <p className="text-gray-500">
                {SCENARIO_LABELS[scenario] || scenario} • {formatDateTime(completedAt)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          {/* Session Stats */}
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <Clock className="w-4 h-4" />
              Duration: <span className="text-gray-900 font-medium">{formatDuration(duration || 0)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <BarChart3 className="w-4 h-4" />
              Overall: <span className="text-gray-900 font-semibold">
                {scores?.overall}% ({overallLevel.label})
              </span>
            </div>
          </div>
        </div>

        {/* Overall Score Card */}
        <div className="bg-gradient-to-br from-primary-600 to-secondary-600 rounded-2xl p-8 mb-8 text-center shadow-lg">
          <h2 className="text-lg text-primary-100 mb-2">Overall Performance</h2>
          <div className="text-6xl font-bold text-white mb-2">{scores?.overall}%</div>
          <p className="text-lg text-primary-200">{overallLevel.label}</p>
        </div>

        {/* Score Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <ScoreCard
            title="Confidence"
            score={scores?.confidence}
            icon={TrendingUp}
            color="primary"
          />
          <ScoreCard
            title="Clarity"
            score={scores?.clarity}
            icon={CheckCircle2}
            color="accent"
          />
          <ScoreCard
            title="Empathy"
            score={scores?.empathy}
            icon={Lightbulb}
            color="secondary"
          />
          <ScoreCard
            title="Communication"
            score={scores?.communication}
            icon={BarChart3}
            color="yellow"
          />
        </div>

        {/* Detailed Feedback */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Strengths & Improvements */}
          <FeatureBreakdown
            strengths={feedbackData?.strengths || []}
            improvements={feedbackData?.improvements || []}
          />

          {/* Tips */}
          <ImprovementTips tips={feedbackData?.tips || []} />
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/session/setup" className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors">
            Practice Again
          </Link>
          <Link to="/dashboard" className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            View All Sessions
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Feedback;
