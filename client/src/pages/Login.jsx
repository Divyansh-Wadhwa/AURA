/**
 * Login Page - Uses Auth0 Universal Login
 * 
 * Auth Flow:
 * 1. User clicks "Continue with Auth0" button
 * 2. Redirects to Auth0 Universal Login page
 * 3. User authenticates (email/password, social, etc.)
 * 4. Auth0 redirects back to app with tokens
 * 5. AuthContext syncs user with backend
 */
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Loader2, Shield, Zap, Users } from 'lucide-react';

const Login = () => {
  const { login, isAuthenticated, loading, error } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async () => {
    await login();
  };

  // Show loading state while Auth0 initializes
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Decorative top gradient */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-400 via-secondary-400 to-primary-400"></div>
      
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100">
            {/* Logo */}
            <Link to="/" className="flex items-center justify-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-secondary-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">AURA</span>
            </Link>

            {/* Welcome Text */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to AURA</h1>
              <p className="text-gray-500">AI-Powered Interview Practice Platform</p>
            </div>

            {/* Features */}
            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-primary-500" />
                </div>
                <span>Secure authentication powered by Auth0</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-8 h-8 rounded-lg bg-secondary-50 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-secondary-500" />
                </div>
                <span>Real-time AI feedback on your responses</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-8 h-8 rounded-lg bg-accent-50 flex items-center justify-center">
                  <Users className="w-4 h-4 text-accent-500" />
                </div>
                <span>Sign in with Google, LinkedIn, or email</span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm mb-6">
                {error}
              </div>
            )}

            {/* Auth0 Login Button */}
            <button
              onClick={handleLogin}
              className="w-full px-6 py-4 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl font-semibold hover:from-primary-600 hover:to-secondary-600 transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary-500/25"
            >
              <Shield className="w-5 h-5" />
              Continue with Auth0
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-400">Secure Login</span>
              </div>
            </div>

            {/* Info Text */}
            <p className="text-center text-xs text-gray-400">
              By continuing, you agree to our{' '}
              <a href="#" className="text-primary-500 hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-primary-500 hover:underline">Privacy Policy</a>
            </p>
          </div>

          {/* Security Badge */}
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
            <Shield className="w-4 h-4" />
            <span>Protected by Auth0 enterprise-grade security</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-sm text-gray-500">
        For the best experience, please use the latest versions of <strong className="text-gray-700">Chrome</strong>, <strong className="text-gray-700">Edge</strong>, or <strong className="text-gray-700">Firefox</strong>.
      </div>
    </div>
  );
};

export default Login;
