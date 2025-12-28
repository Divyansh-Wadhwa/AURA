import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSession } from '../context/SessionContext';
import {
  Sparkles,
  Plus,
  TrendingUp,
  Clock,
  Target,
  ChevronRight,
  LogOut,
  User,
  BarChart3,
  Calendar,
  Award,
  Moon,
  Sun,
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { formatRelativeTime, formatDuration, formatScore } from '../utils/formatters';
import { SCENARIO_LABELS, getScoreLevel } from '../utils/constants';
import { useTheme } from '../context/ThemeContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = () => {
  const { user, logout, accessToken } = useAuth();
  const { sessions, stats, getUserSessions, getUserStats, getProgressTrends } = useSession();
  const { isDarkMode, toggleTheme } = useTheme();
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Wait for access token before making API calls
    if (!accessToken) return;
    
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        getUserSessions(1, 5),
        getUserStats(),
        getProgressTrends(30).then((res) => {
          if (res.success) setTrends(res.data);
        }),
      ]);
      setLoading(false);
    };
    loadData();
  }, [accessToken, getUserSessions, getUserStats, getProgressTrends]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const chartData = {
    labels: trends?.trends?.map((t) => new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })) || [],
    datasets: [
      {
        label: 'Overall Score',
        data: trends?.trends?.map((t) => t.scores?.overall) || [],
        borderColor: 'rgb(139, 92, 246)',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgb(255, 255, 255)',
        borderColor: 'rgb(229, 231, 235)',
        borderWidth: 1,
        titleColor: 'rgb(17, 24, 39)',
        bodyColor: 'rgb(75, 85, 99)',
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(229, 231, 235, 0.5)' },
        ticks: { color: 'rgb(107, 114, 128)' },
      },
      y: {
        min: 0,
        max: 100,
        grid: { color: 'rgba(229, 231, 235, 0.5)' },
        ticks: { color: 'rgb(107, 114, 128)' },
      },
    },
  };

  const skillData = stats?.skillAverages || {
    confidence: 0,
    clarity: 0,
    empathy: 0,
    communication: 0,
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo - Links to Landing Page */}
            <Link to="/" className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-600 to-secondary-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>AURA</span>
              </div>
              {/* Avatar Emojis */}
              <div className="hidden sm:flex items-center -space-x-1 ml-1">
                <span className="text-lg">👩‍💼</span>
                <span className="text-lg">👨‍💻</span>
                <span className="text-lg">🧑‍🎓</span>
              </div>
            </Link>

            {/* Center Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              <Link to="/dashboard" className={`${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} text-sm font-medium transition-colors`}>Dashboard</Link>
              <Link to="/session/setup" className={`${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} text-sm font-medium transition-colors`}>Practice</Link>
              <a href="#" className="text-pink-500 hover:text-pink-600 text-sm font-medium transition-colors flex items-center gap-1 group">
                Trending
                <svg className="w-3 h-3 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </a>
              <a href="#" className={`${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} text-sm font-medium transition-colors`}>Progress</a>
            </div>
            
            {/* Right Side */}
            <div className="flex items-center gap-3">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'} transition-colors`}
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <Link to="/session/setup" className="px-4 py-2 bg-primary-600 text-white rounded-full font-medium hover:bg-primary-700 transition-colors flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" />
                New Session
              </Link>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
            Welcome back, {user?.name?.split(' ')[0] || 'User'}!
          </h1>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Track your progress and continue improving your communication skills.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-5 border shadow-sm`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm`}>Total Sessions</p>
                <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats?.totalSessions || 0}</p>
              </div>
            </div>
          </div>
          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-5 border shadow-sm`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center">
                <Award className="w-5 h-5 text-accent-600" />
              </div>
              <div>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm`}>Average Score</p>
                <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatScore(stats?.averageScore)}%</p>
              </div>
            </div>
          </div>
          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-5 border shadow-sm`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-secondary-600" />
              </div>
              <div>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm`}>This Week</p>
                <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {trends?.totalSessions || 0} <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>sessions</span>
                </p>
              </div>
            </div>
          </div>
          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-5 border shadow-sm`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm`}>Best Skill</p>
                <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} capitalize`}>
                  {Object.entries(skillData).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Progress Chart */}
          <div className={`lg:col-span-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-6 border shadow-sm`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Progress Over Time</h2>
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Last 30 days</span>
            </div>
            <div className="h-64">
              {trends?.trends?.length > 0 ? (
                <Line data={chartData} options={chartOptions} />
              ) : (
                <div className={`h-full flex items-center justify-center ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Complete sessions to see your progress
                </div>
              )}
            </div>
          </div>

          {/* Skills Breakdown */}
          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-6 border shadow-sm`}>
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-6`}>Skills Breakdown</h2>
            <div className="space-y-4">
              {Object.entries(skillData).map(([skill, score]) => {
                const level = getScoreLevel(score);
                return (
                  <div key={skill}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} capitalize`}>{skill}</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-medium`}>{formatScore(score)}%</span>
                    </div>
                    <div className={`h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-full overflow-hidden`}>
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full transition-all duration-500"
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Sessions */}
        <div className={`mt-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-6 border shadow-sm`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Recent Sessions</h2>
            {sessions.length > 0 && (
              <button className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500" />
            </div>
          ) : sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map((session) => (
                <Link
                  key={session._id}
                  to={session.status === 'completed' ? `/feedback/${session._id}` : '#'}
                  className={`block p-4 rounded-xl ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 border-gray-600' : 'bg-gray-50 hover:bg-gray-100 border-gray-200'} border transition-colors`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-medium`}>
                          {SCENARIO_LABELS[session.scenario] || session.scenario}
                        </p>
                        <div className={`flex items-center gap-3 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(session.duration || 0)}
                          </span>
                          <span>{formatRelativeTime(session.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {session.scores?.overall && (
                        <div className="text-right">
                          <p className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold`}>{session.scores.overall}%</p>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {getScoreLevel(session.scores.overall).label}
                          </p>
                        </div>
                      )}
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        session.status === 'completed' ? 'bg-green-100 text-green-700' :
                        session.status === 'analyzing' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-primary-100 text-primary-700'
                      }`}>
                        {session.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className={`w-16 h-16 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center mx-auto mb-4`}>
                <BarChart3 className={`w-8 h-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-4`}>No sessions yet. Start your first practice session!</p>
              <Link to="/session/setup" className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors inline-flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Start Session
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
