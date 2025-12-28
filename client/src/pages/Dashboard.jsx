import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSession } from '../context/SessionContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import {
  Sparkles,
  Plus,
  Clock,
  ChevronRight,
  LogOut,
  Moon,
  Sun,
  MessageSquare,
  Video,
  Users,
  Mic,
  Lightbulb,
  Target,
  Calendar,
  ArrowRight,
  Star,
  FlaskConical,
  CheckCircle,
  Play,
  Heart,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { formatRelativeTime, formatDuration } from '../utils/formatters';
import { SCENARIO_LABELS } from '../utils/constants';

// Practice type configurations
const PRACTICE_TYPES = {
  mock_interview: {
    icon: MessageSquare,
    label: 'Mock Interview',
    description: 'Practice answering common interview questions',
    color: 'primary',
    scenario: 'job_interview',
  },
  presentation: {
    icon: Video,
    label: 'Presentation Practice',
    description: 'Rehearse and refine your presentation delivery',
    color: 'secondary',
    scenario: 'presentation',
  },
  group_discussion: {
    icon: Users,
    label: 'Group Discussion',
    description: 'Practice collaborative conversations',
    color: 'accent',
    scenario: 'group_discussion',
  },
  live_conversation: {
    icon: Mic,
    label: 'Live Conversation',
    description: 'Natural back-and-forth dialogue practice',
    color: 'pink',
    scenario: 'casual_conversation',
  },
};

// Disposition-based UI configurations
const DISPOSITION_UI = {
  cautious: {
    greeting: "You're doing great just by being here",
    encouragement: "Every conversation is a chance to grow",
    progressLabel: "Your journey so far",
    ctaText: "When you're ready",
    showSessionCount: false,
  },
  anxious: {
    greeting: "Welcome back! No pressure today",
    encouragement: "Small steps lead to big changes",
    progressLabel: "You've shown up",
    ctaText: "Try something gentle",
    showSessionCount: false,
  },
  neutral: {
    greeting: "Good to see you",
    encouragement: "Your style is evolving naturally",
    progressLabel: "Your progress",
    ctaText: "Ready to practice?",
    showSessionCount: true,
  },
  confident: {
    greeting: "Welcome back",
    encouragement: "Let's refine your edge",
    progressLabel: "Your growth trajectory",
    ctaText: "Challenge yourself",
    showSessionCount: true,
  },
  overconfident: {
    greeting: "Back for more",
    encouragement: "Mastery comes from deliberate practice",
    progressLabel: "Sessions completed",
    ctaText: "Push your limits",
    showSessionCount: true,
  },
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { sessions, getUserSessions } = useSession();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [experimentCompleted, setExperimentCompleted] = useState(false);
  const [expandedSession, setExpandedSession] = useState(null);

  // Check if coming from onboarding
  useEffect(() => {
    if (location.state?.fromOnboarding) {
      setShowWelcome(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Load behavioral profile and sessions
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes] = await Promise.all([
        api.get('/auth/behavioral-profile'),
        getUserSessions(1, 10),
      ]);
      setProfile(profileRes.data.data);
    } catch (err) {
      console.error('Error loading profile:', err);
      setProfile({
        style: null,
        reflection: 'Complete a conversation to discover your communication style.',
        hasBaseline: false,
        disposition: 'neutral',
        feedbackStrategy: { tone: 'balanced', showNumbers: false },
      });
    }
    setLoading(false);
  }, [getUserSessions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleStartPractice = (type) => {
    const config = PRACTICE_TYPES[type];
    navigate('/session/setup', { 
      state: { 
        preselectedScenario: config?.scenario,
        fromDashboard: true 
      } 
    });
  };

  const handleExperimentComplete = () => {
    setExperimentCompleted(true);
    setTimeout(() => setExperimentCompleted(false), 3000);
  };

  // Get disposition-based UI config
  const disposition = profile?.disposition || 'neutral';
  const uiConfig = DISPOSITION_UI[disposition] || DISPOSITION_UI.neutral;

  // Get color classes for practice types
  const getColorClasses = (color) => {
    const colors = {
      primary: 'bg-primary-100 text-primary-600 group-hover:bg-primary-500',
      secondary: 'bg-secondary-100 text-secondary-600 group-hover:bg-secondary-500',
      accent: 'bg-accent-100 text-accent-600 group-hover:bg-accent-500',
      pink: 'bg-pink-100 text-pink-600 group-hover:bg-pink-500',
    };
    return colors[color] || colors.primary;
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-600 to-secondary-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>AURA</span>
            </Link>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'} transition-colors`}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <div className="relative group">
                <button className={`flex items-center gap-2 p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-medium text-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                </button>
                <div className={`absolute right-0 top-full mt-2 w-48 py-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all`}>
                  <div className={`px-4 py-2 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                    <p className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-medium truncate`}>{user?.name}</p>
                    <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm truncate`}>{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className={`w-full px-4 py-2 text-left ${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'} flex items-center gap-2`}
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message (shown after onboarding) */}
        {showWelcome && (
          <div className={`mb-8 p-6 rounded-2xl ${isDarkMode ? 'bg-gradient-to-r from-primary-900/50 to-secondary-900/50 border-primary-800' : 'bg-gradient-to-r from-primary-50 to-secondary-50 border-primary-100'} border animate-fade-in`}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center flex-shrink-0">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
                  Thanks for sharing a bit about yourself!
                </h2>
                <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                  I've put together some thoughts based on our conversation. Take a look below.
                </p>
              </div>
              <button 
                onClick={() => setShowWelcome(false)}
                className={`${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'} text-xl`}
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Greeting Section - Adaptive based on disposition */}
        <div className="mb-8">
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
            {uiConfig.greeting}, {user?.name?.split(' ')[0] || 'there'}! 👋
          </h1>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
            {uiConfig.encouragement}
          </p>
        </div>

        {/* Main Reflection Card */}
        <div className={`rounded-2xl ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border shadow-sm overflow-hidden mb-8`}>
          {loading ? (
            <div className="p-8 flex justify-center">
              <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : (
            <>
              {/* Communication Style Badge */}
              {profile?.style && profile.hasBaseline && (
                <div className="px-6 pt-6 pb-2">
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${isDarkMode ? 'bg-primary-900/50 text-primary-300' : 'bg-primary-100 text-primary-700'}`}>
                    <Sparkles className="w-4 h-4" />
                    {profile.style}
                  </span>
                </div>
              )}

              {/* Main Reflection */}
              <div className={`mx-6 my-4 p-5 rounded-xl ${isDarkMode ? 'bg-gray-700/50' : 'bg-gradient-to-br from-primary-50 to-secondary-50'}`}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'} font-medium leading-relaxed`}>
                      "{profile?.reflection || 'You have a natural and authentic communication style.'}"
                    </p>
                    {uiConfig.showSessionCount && profile?.sessionCount > 0 && (
                      <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Based on {profile.sessionCount} practice session{profile.sessionCount > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Focus Area (Opportunity) */}
              {profile?.focusArea && (
                <div className={`mx-6 mb-4 p-4 rounded-xl ${isDarkMode ? 'bg-accent-900/30 border-accent-800' : 'bg-accent-50 border-accent-100'} border cursor-pointer hover:shadow-md transition-shadow`}>
                  <div className="flex items-start gap-3">
                    <Target className={`w-5 h-5 ${isDarkMode ? 'text-accent-400' : 'text-accent-600'} mt-0.5 flex-shrink-0`} />
                    <div>
                      <h4 className={`font-medium ${isDarkMode ? 'text-accent-300' : 'text-accent-800'} mb-1`}>
                        Opportunity: {profile.focusArea}
                      </h4>
                      {profile.focusRationale && (
                        <p className={`text-sm ${isDarkMode ? 'text-accent-400' : 'text-accent-700'}`}>
                          {profile.focusRationale}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Micro-Experiment Card - Interactive */}
              {profile?.microExperiment && (
                <div className={`mx-6 mb-6 p-4 rounded-xl ${isDarkMode ? 'bg-secondary-900/30 border-secondary-800' : 'bg-secondary-50 border-secondary-100'} border`}>
                  <div className="flex items-start gap-3">
                    <FlaskConical className={`w-5 h-5 ${isDarkMode ? 'text-secondary-400' : 'text-secondary-600'} mt-0.5 flex-shrink-0`} />
                    <div className="flex-1">
                      <h4 className={`font-medium ${isDarkMode ? 'text-secondary-300' : 'text-secondary-800'} mb-1`}>
                        Try this in your next conversation
                      </h4>
                      <p className={`text-sm ${isDarkMode ? 'text-secondary-400' : 'text-secondary-700'} mb-3`}>
                        {profile.microExperiment}
                      </p>
                      <button
                        onClick={handleExperimentComplete}
                        disabled={experimentCompleted}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          experimentCompleted 
                            ? 'bg-green-500 text-white' 
                            : isDarkMode 
                              ? 'bg-secondary-700 hover:bg-secondary-600 text-secondary-200' 
                              : 'bg-secondary-200 hover:bg-secondary-300 text-secondary-800'
                        }`}
                      >
                        {experimentCompleted ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Great job!
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            I tried this!
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* No baseline yet - encourage first session */}
              {!profile?.hasBaseline && (
                <div className={`mx-6 mb-6 p-5 rounded-xl ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'} text-center`}>
                  <Heart className={`w-8 h-8 mx-auto mb-3 ${isDarkMode ? 'text-pink-400' : 'text-pink-500'}`} />
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Start a practice session to discover your unique communication style
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Practice Options - Interactive Cards */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {uiConfig.ctaText}
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {Object.entries(PRACTICE_TYPES).slice(0, 4).map(([type, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={type}
                  onClick={() => handleStartPractice(type)}
                  className={`group p-5 rounded-xl ${isDarkMode ? 'bg-gray-800 hover:bg-gray-750 border-gray-700' : 'bg-white hover:bg-gray-50 border-gray-200'} border text-left transition-all hover:shadow-lg hover:-translate-y-1`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl ${getColorClasses(config.color)} flex items-center justify-center transition-colors group-hover:text-white`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-1 flex items-center gap-2`}>
                        {config.label}
                        <ArrowRight className={`w-4 h-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all`} />
                      </h3>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {config.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Start Button */}
          <Link
            to="/session/setup"
            className={`mt-4 w-full p-4 rounded-xl ${isDarkMode ? 'bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-500 hover:to-secondary-500' : 'bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600'} text-white flex items-center justify-center gap-2 font-semibold transition-all hover:shadow-lg`}
          >
            <Zap className="w-5 h-5" />
            Quick Start Any Session
          </Link>
        </div>

        {/* Recent Sessions - Narrative Style */}
        {sessions && sessions.length > 0 && (
          <div className={`rounded-2xl ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border shadow-sm overflow-hidden`}>
            <div className={`p-5 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <h2 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {uiConfig.progressLabel}
              </h2>
            </div>
            <div className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
              {sessions.slice(0, 5).map((session, index) => (
                <div key={session._id}>
                  <Link
                    to={`/feedback/${session._id}`}
                    onClick={(e) => {
                      if (session.status !== 'completed') {
                        e.preventDefault();
                      }
                    }}
                    className={`flex items-center gap-4 p-4 ${isDarkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'} transition-colors cursor-pointer`}
                  >
                    <div className={`w-10 h-10 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center`}>
                      <Calendar className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} truncate`}>
                        {SCENARIO_LABELS[session.scenario] || session.scenario?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Practice Session'}
                      </p>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} flex items-center gap-2`}>
                        <Clock className="w-3 h-3" />
                        {formatDuration(session.duration || 0)} • {formatRelativeTime(session.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {session.status === 'completed' && (
                        <span className={`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                          View insights
                        </span>
                      )}
                      {session.status === 'analyzing' && (
                        <span className={`text-sm ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'} flex items-center gap-1`}>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Reflecting...
                        </span>
                      )}
                      <ChevronRight className={`w-5 h-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State for New Users */}
        {(!sessions || sessions.length === 0) && !loading && (
          <div className={`rounded-2xl ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border shadow-sm p-8 text-center`}>
            <div className={`w-16 h-16 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center mx-auto mb-4`}>
              <MessageSquare className={`w-8 h-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            </div>
            <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
              Your practice history will appear here
            </h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-4`}>
              Each conversation helps us understand your unique style better
            </p>
            <Link 
              to="/session/setup" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Start Your First Session
            </Link>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
