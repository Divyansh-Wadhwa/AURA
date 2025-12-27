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

// Module-level flag to prevent double init in StrictMode
let globalInitLock = false;

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
  
  // Use ref to track initialization (survives StrictMode remount)
  const initRef = useRef(false);

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
   * Uses sessionStorage to track sync state across component remounts
   */
  useEffect(() => {
    // Don't do anything while Auth0 is still loading
    if (auth0Loading) {
      return;
    }

    // Check if already synced for this user (survives HMR and StrictMode)
    const syncedUserId = sessionStorage.getItem('aura_synced_user');
    const currentUserId = auth0User?.sub;
    
    console.log('[Auth] Init check:', { syncedUserId, currentUserId, initRef: initRef.current, globalLock: globalInitLock, loading });
    
    // If we've already synced this user, just restore state from sessionStorage
    if (syncedUserId && syncedUserId === currentUserId) {
      console.log('[Auth] Already synced, skipping');
      initRef.current = true;
      globalInitLock = true;
      if (loading) setLoading(false);
      return;
    }

    // Prevent concurrent init with both ref and module lock
    if (initRef.current || globalInitLock) {
      console.log('[Auth] Locked, skipping');
      if (loading) setLoading(false);
      return;
    }

    // Lock immediately
    console.log('[Auth] Starting sync...');
    initRef.current = true;
    globalInitLock = true;

    const initAuth = async () => {
      // Clear any old legacy tokens
      localStorage.removeItem('aura_token');
      
      if (auth0IsAuthenticated && auth0User) {
        try {
          const token = await getAccessTokenSilently();
          setAccessToken(token);
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Sync with backend
          const syncedUser = await syncUserWithBackend(token, auth0User);
          setUser(syncedUser);
          
          // Mark this user as synced in sessionStorage
          sessionStorage.setItem('aura_synced_user', auth0User.sub);
        } catch (err) {
          console.error('[Auth] Token retrieval failed:', err);
          setError('Failed to authenticate. Please try again.');
        }
      } else {
        // Not authenticated - clear state
        setUser(null);
        setAccessToken(null);
        sessionStorage.removeItem('aura_synced_user');
        delete api.defaults.headers.common['Authorization'];
      }
      
      setLoading(false);
    };

    initAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth0Loading, auth0IsAuthenticated]);

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
    // Reset locks and session tracking so next login will sync
    initRef.current = false;
    globalInitLock = false;
    sessionStorage.removeItem('aura_synced_user');
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
