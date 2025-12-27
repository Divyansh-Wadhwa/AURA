/**
 * Auth Context - Integrates Auth0 with application state
 * 
 * Auth Flow:
 * 1. User clicks login -> Auth0 Universal Login page
 * 2. Auth0 authenticates and redirects back with tokens
 * 3. Access token is used for API calls (Bearer token)
 * 4. User info synced with backend on first login
 */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  // Auth0 hook provides authentication state and methods
  const {
    isAuthenticated: auth0IsAuthenticated,
    isLoading: auth0Loading,
    user: auth0User,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
    error: auth0Error,
  } = useAuth0();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  
  // Track if we've already synced to prevent infinite loop
  const hasSyncedRef = useRef(false);
  const syncingRef = useRef(false);

  /**
   * Sync Auth0 user with backend
   * Creates or updates user record in our database
   */
  const syncUserWithBackend = useCallback(async (token, auth0UserData) => {
    try {
      // Set token for API calls
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Sync user with backend (creates user if doesn't exist)
      const response = await api.post('/auth/sync', {
        auth0Id: auth0UserData.sub,
        email: auth0UserData.email,
        name: auth0UserData.name || auth0UserData.nickname,
        picture: auth0UserData.picture,
      });
      
      return response.data.data;
    } catch (err) {
      console.error('[Auth] Backend sync failed:', err);
      // Return basic user info even if sync fails
      return {
        _id: auth0UserData.sub,
        email: auth0UserData.email,
        name: auth0UserData.name || auth0UserData.nickname,
        picture: auth0UserData.picture,
      };
    }
  }, []);

  /**
   * Get access token and sync user on Auth0 authentication
   * Only runs once per session to prevent infinite loops
   */
  useEffect(() => {
    const initAuth = async () => {
      // Wait for Auth0 to finish loading
      if (auth0Loading) return;

      // If authenticated and not yet synced
      if (auth0IsAuthenticated && auth0User && !hasSyncedRef.current && !syncingRef.current) {
        syncingRef.current = true;
        
        try {
          // Get access token for API calls
          const token = await getAccessTokenSilently();
          setAccessToken(token);
          
          // Set token in API defaults
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Sync with backend (only once)
          const syncedUser = await syncUserWithBackend(token, auth0User);
          setUser(syncedUser);
          hasSyncedRef.current = true;
        } catch (err) {
          console.error('[Auth] Token retrieval failed:', err);
          setError('Failed to authenticate. Please try again.');
        } finally {
          syncingRef.current = false;
        }
      } else if (!auth0IsAuthenticated && !auth0Loading) {
        // Clear auth state when logged out
        setUser(null);
        setAccessToken(null);
        hasSyncedRef.current = false;
        delete api.defaults.headers.common['Authorization'];
      }
      
      setLoading(false);
    };

    initAuth();
  }, [auth0IsAuthenticated, auth0Loading, auth0User, getAccessTokenSilently, syncUserWithBackend]);

  /**
   * Login - Redirects to Auth0 Universal Login
   */
  const login = useCallback(async () => {
    try {
      setError(null);
      await loginWithRedirect();
      return { success: true };
    } catch (err) {
      const message = err.message || 'Login failed';
      setError(message);
      return { success: false, error: message };
    }
  }, [loginWithRedirect]);

  /**
   * Logout - Clears Auth0 session and local state
   */
  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    delete api.defaults.headers.common['Authorization'];
    
    auth0Logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  }, [auth0Logout]);

  /**
   * Get fresh access token (useful for long-lived sessions)
   */
  const getToken = useCallback(async () => {
    try {
      const token = await getAccessTokenSilently();
      setAccessToken(token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      return token;
    } catch (err) {
      console.error('[Auth] Token refresh failed:', err);
      return null;
    }
  }, [getAccessTokenSilently]);

  /**
   * Update user profile
   */
  const updateProfile = useCallback(async (data) => {
    try {
      const response = await api.put('/auth/profile', data);
      setUser(response.data.data);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Profile update failed';
      return { success: false, error: message };
    }
  }, []);

  const clearError = () => setError(null);

  const value = {
    user,
    loading: loading || auth0Loading,
    error: error || auth0Error?.message,
    login,
    logout,
    updateProfile,
    clearError,
    getToken,
    accessToken,
    isAuthenticated: auth0IsAuthenticated && !!user,
    // Expose Auth0 user for additional info
    auth0User,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
