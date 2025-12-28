/**
 * Login Page - Supports both Auth0 and Manual Login
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Loader2, Shield, Zap, Users, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const { loginWithAuth0, manualLogin, manualRegister, loading, error, clearError } = useAuth();
  
  const [isManualMode, setIsManualMode] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);
    
    if (!formData.email || !formData.password) {
      setFormError('Please fill in all required fields');
      setIsSubmitting(false);
      return;
    }

    if (isRegisterMode && !formData.name) {
      setFormError('Please enter your name');
      setIsSubmitting(false);
      return;
    }

    const result = isRegisterMode 
      ? await manualRegister(formData.name, formData.email, formData.password)
      : await manualLogin(formData.email, formData.password);
    
    if (!result.success) {
      setFormError(result.error || 'Authentication failed');
    }
    setIsSubmitting(false);
  };

  const toggleMode = () => {
    setIsManualMode(!isManualMode);
    setFormError('');
    clearError?.();
  };

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
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-400 via-secondary-400 to-primary-400"></div>
      
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100">
            <Link to="/" className="flex items-center justify-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-secondary-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">AURA</span>
            </Link>

            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {isManualMode ? (isRegisterMode ? 'Create Account' : 'Sign In') : 'Welcome to AURA'}
              </h1>
              <p className="text-gray-500">
                {isManualMode ? (isRegisterMode ? 'Start your journey' : 'Continue your practice') : 'AI-Powered Behavioral Practice'}
              </p>
            </div>

            {(error || formError) && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm mb-6">
                {error || formError}
              </div>
            )}

            {!isManualMode ? (
              <>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-primary-500" />
                    </div>
                    <span>Secure authentication options</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="w-8 h-8 rounded-lg bg-secondary-50 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-secondary-500" />
                    </div>
                    <span>Real-time AI behavioral coaching</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="w-8 h-8 rounded-lg bg-accent-50 flex items-center justify-center">
                      <Users className="w-4 h-4 text-accent-500" />
                    </div>
                    <span>No scores, just growth-focused feedback</span>
                  </div>
                </div>

                <button
                  onClick={loginWithAuth0}
                  className="w-full px-6 py-4 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl font-semibold hover:from-primary-600 hover:to-secondary-600 transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary-500/25 mb-4"
                >
                  <Shield className="w-5 h-5" />
                  Continue with Auth0
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-400">or</span>
                  </div>
                </div>

                <button
                  onClick={toggleMode}
                  className="w-full px-6 py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-primary-300 hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
                >
                  <Mail className="w-5 h-5" />
                  Continue with Email
                </button>
              </>
            ) : (
              <>
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  {isRegisterMode && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                          placeholder="Your name"
                        />
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full px-6 py-4 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl font-semibold hover:from-primary-600 hover:to-secondary-600 transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary-500/25 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (isRegisterMode ? 'Create Account' : 'Sign In')}
                  </button>
                </form>

                <p className="text-center text-sm text-gray-500 mt-4">
                  {isRegisterMode ? 'Already have an account?' : "Don't have an account?"}{' '}
                  <button onClick={() => setIsRegisterMode(!isRegisterMode)} className="text-primary-500 hover:underline font-medium">
                    {isRegisterMode ? 'Sign in' : 'Create one'}
                  </button>
                </p>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-400">or</span>
                  </div>
                </div>

                <button onClick={toggleMode} className="w-full px-6 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-all text-sm">
                  ← Back to all login options
                </button>
              </>
            )}

            <p className="text-center text-xs text-gray-400 mt-6">
              By continuing, you agree to our{' '}
              <a href="#" className="text-primary-500 hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-primary-500 hover:underline">Privacy Policy</a>
            </p>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
            <Shield className="w-4 h-4" />
            <span>Your data is secure and private</span>
          </div>
        </div>
      </div>

      <div className="text-center py-6 text-sm text-gray-500">
        For the best experience, use <strong className="text-gray-700">Chrome</strong>, <strong className="text-gray-700">Edge</strong>, or <strong className="text-gray-700">Firefox</strong>.
      </div>
    </div>
  );
};

export default Login;
