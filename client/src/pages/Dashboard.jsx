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
  const { user, logout } = useAuth();
  const { sessions, stats, getUserSessions, getUserStats, getProgressTrends } = useSession();
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
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
  }, [getUserSessions, getUserStats, getProgressTrends]);

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
        borderColor: 'rgb(14, 165, 233)',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
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
        backgroundColor: 'rgb(15, 23, 42)',
        borderColor: 'rgb(51, 65, 85)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(51, 65, 85, 0.5)' },
        ticks: { color: 'rgb(148, 163, 184)' },
      },
      y: {
        min: 0,
        max: 100,
        grid: { color: 'rgba(51, 65, 85, 0.5)' },
        ticks: { color: 'rgb(148, 163, 184)' },
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
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-dark-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg gradient-bg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">A.U.R.A</span>
            </Link>
            
            <div className="flex items-center gap-4">
              <Link to="/session/setup" className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" />
                New Session
              </Link>
              <div className="relative group">
                <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-dark-800 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-medium text-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                </button>
                <div className="absolute right-0 top-full mt-2 w-48 py-2 bg-dark-800 border border-dark-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="px-4 py-2 border-b border-dark-700">
                    <p className="text-white font-medium truncate">{user?.name}</p>
                    <p className="text-dark-400 text-sm truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-dark-300 hover:text-white hover:bg-dark-700 flex items-center gap-2"
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
          <h1 className="text-2xl font-bold text-white mb-1">
            Welcome back, {user?.name?.split(' ')[0] || 'User'}!
          </h1>
          <p className="text-dark-400">Track your progress and continue improving your interview skills.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-900/50 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <p className="text-dark-400 text-sm">Total Sessions</p>
                <p className="text-2xl font-bold text-white">{stats?.totalSessions || 0}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent-900/50 flex items-center justify-center">
                <Award className="w-5 h-5 text-accent-400" />
              </div>
              <div>
                <p className="text-dark-400 text-sm">Average Score</p>
                <p className="text-2xl font-bold text-white">{formatScore(stats?.averageScore)}%</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary-900/50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-secondary-400" />
              </div>
              <div>
                <p className="text-dark-400 text-sm">This Week</p>
                <p className="text-2xl font-bold text-white">
                  {trends?.totalSessions || 0} <span className="text-sm text-dark-400">sessions</span>
                </p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-900/50 flex items-center justify-center">
                <Target className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-dark-400 text-sm">Best Skill</p>
                <p className="text-2xl font-bold text-white capitalize">
                  {Object.entries(skillData).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Progress Chart */}
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Progress Over Time</h2>
              <span className="text-sm text-dark-400">Last 30 days</span>
            </div>
            <div className="h-64">
              {trends?.trends?.length > 0 ? (
                <Line data={chartData} options={chartOptions} />
              ) : (
                <div className="h-full flex items-center justify-center text-dark-500">
                  Complete sessions to see your progress
                </div>
              )}
            </div>
          </div>

          {/* Skills Breakdown */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-6">Skills Breakdown</h2>
            <div className="space-y-4">
              {Object.entries(skillData).map(([skill, score]) => {
                const level = getScoreLevel(score);
                return (
                  <div key={skill}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-dark-300 capitalize">{skill}</span>
                      <span className={level.color}>{formatScore(score)}%</span>
                    </div>
                    <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-500"
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
        <div className="mt-6 card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Recent Sessions</h2>
            {sessions.length > 0 && (
              <button className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1">
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
                  className="block p-4 rounded-lg bg-dark-800/50 hover:bg-dark-800 border border-dark-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary-900/50 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-primary-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {SCENARIO_LABELS[session.scenario] || session.scenario}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-dark-400">
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
                          <p className="text-white font-semibold">{session.scores.overall}%</p>
                          <p className={`text-sm ${getScoreLevel(session.scores.overall).color}`}>
                            {getScoreLevel(session.scores.overall).label}
                          </p>
                        </div>
                      )}
                      <span className={`badge ${
                        session.status === 'completed' ? 'badge-success' :
                        session.status === 'analyzing' ? 'badge-warning' :
                        'badge-primary'
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
              <div className="w-16 h-16 rounded-full bg-dark-800 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-dark-500" />
              </div>
              <p className="text-dark-400 mb-4">No sessions yet. Start your first interview practice!</p>
              <Link to="/session/setup" className="btn-primary inline-flex items-center gap-2">
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
