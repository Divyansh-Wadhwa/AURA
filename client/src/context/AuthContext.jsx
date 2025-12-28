/**
 * Auth Context - Supports both Auth0 and Manual Login
 * 
 * Auth0: Primary SSO authentication
 * Manual: Fallback email/password for development or when Auth0 unavailable
 */
import { createContext, useContext, useCallback, useEffect, useState, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const {
    isAuthenticated: auth0IsAuthenticated,
    isLoading: auth0Loading,
    user: auth0User,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0();

  const [accessToken, setAccessToken] = useState(null);
  const [manualUser, setManualUser] = useState(null);
  const [manualLoading, setManualLoading] = useState(true);
  const [error, setError] = useState(null);
  const tokenFetchedRef = useRef(false);

  // Check for manual auth on mount
  useEffect(() => {
    const manualToken = localStorage.getItem('aura_manual_token');
    if (manualToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${manualToken}`;
      setAccessToken(manualToken);
      
      api.get('/auth/me')
        .then(response => {
          if (response.data.success) {
            setManualUser(response.data.data);
          }
          setManualLoading(false);
        })
        .catch(() => {
          localStorage.removeItem('aura_manual_token');
          delete api.defaults.headers.common['Authorization'];
          setManualLoading(false);
        });
    } else {
      setManualLoading(false);
    }
  }, []);

  // Get Auth0 token when authenticated
  useEffect(() => {
    if (auth0IsAuthenticated && !auth0Loading && !tokenFetchedRef.current && !manualUser) {
      tokenFetchedRef.current = true;
      getAccessTokenSilently()
        .then(token => {
          setAccessToken(token);
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        })
        .catch(err => console.error('Token error:', err));
    }
    
    if (!auth0IsAuthenticated && !auth0Loading && !manualUser) {
      tokenFetchedRef.current = false;
      setAccessToken(null);
      delete api.defaults.headers.common['Authorization'];
    }
  }, [auth0IsAuthenticated, auth0Loading, getAccessTokenSilently, manualUser]);

  // Auth0 login
  const loginWithAuth0 = useCallback(() => {
    loginWithRedirect();
  }, [loginWithRedirect]);

  // Manual login with email/password
  const manualLogin = useCallback(async (email, password) => {
    try {
      setError(null);
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data.success) {
        const { user: userData, token } = response.data.data;
        localStorage.setItem('aura_manual_token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setAccessToken(token);
        setManualUser(userData);
        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (err) {
      const message = err.response?.data?.message || 'Invalid credentials';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  // Manual registration
  const manualRegister = useCallback(async (name, email, password) => {
    try {
      setError(null);
      const response = await api.post('/auth/register', { name, email, password });
      
      if (response.data.success) {
        const { user: userData, token } = response.data.data;
        localStorage.setItem('aura_manual_token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setAccessToken(token);
        setManualUser(userData);
        return { success: true };
      }
      return { success: false, error: 'Registration failed' };
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  // Legacy login - defaults to Auth0
  const login = useCallback(() => {
    loginWithAuth0();
  }, [loginWithAuth0]);

  // Logout - handles both Auth0 and manual
  const logout = useCallback(() => {
    const wasManualAuth = !!manualUser;
    
    tokenFetchedRef.current = false;
    setAccessToken(null);
    setManualUser(null);
    localStorage.removeItem('aura_manual_token');
    delete api.defaults.headers.common['Authorization'];
    
    if (!wasManualAuth && auth0IsAuthenticated) {
      auth0Logout({ logoutParams: { returnTo: window.location.origin } });
    } else {
      window.location.href = '/';
    }
  }, [auth0Logout, auth0IsAuthenticated, manualUser]);

  const clearError = useCallback(() => setError(null), []);

  // Mark onboarding as complete in local state
  const markOnboardingComplete = useCallback(() => {
    if (manualUser) {
      setManualUser(prev => ({ ...prev, onboardingCompleted: true }));
    }
  }, [manualUser]);

  // Determine current user and auth state
  const user = manualUser || (auth0IsAuthenticated ? auth0User : null);
  const isAuthenticated = !!(manualUser || auth0IsAuthenticated);
  const loading = manualLoading || auth0Loading;

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      isAuthenticated,
      accessToken,
      login,
      loginWithAuth0,
      manualLogin,
      manualRegister,
      logout,
      clearError,
      markOnboardingComplete,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
