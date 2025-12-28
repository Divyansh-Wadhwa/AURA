/**
 * Auth Context - Pure Auth0 Integration
 * 
 * Simple flow:
 * 1. Auth0 handles all authentication state
 * 2. We just wrap it and add backend sync
 * 3. No custom caching - trust Auth0's caching
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
  const {
    isAuthenticated,
    isLoading,
    user: auth0User,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
    error: auth0Error,
  } = useAuth0();

  const [backendUser, setBackendUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [error, setError] = useState(null);
  const syncedRef = useRef(false);

  // Sync user with backend when Auth0 authenticates
  useEffect(() => {
    const syncUser = async () => {
      // Skip if not authenticated or already synced
      if (!isAuthenticated || !auth0User || syncedRef.current) {
        return;
      }

      try {
        const token = await getAccessTokenSilently();
        setAccessToken(token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Sync with backend
        const response = await api.post('/auth/sync', {
          auth0Id: auth0User.sub,
          email: auth0User.email,
          name: auth0User.name || auth0User.nickname,
          picture: auth0User.picture,
        });
        
        setBackendUser(response.data.data);
        syncedRef.current = true;
      } catch (err) {
        console.error('[Auth] Sync failed:', err);
        // Use Auth0 user data as fallback
        setBackendUser({
          _id: auth0User.sub,
          email: auth0User.email,
          name: auth0User.name || auth0User.nickname,
          picture: auth0User.picture,
        });
        syncedRef.current = true;
      }
    };

    if (!isLoading) {
      if (isAuthenticated && auth0User) {
        syncUser();
      } else {
        // Clear state when not authenticated
        setBackendUser(null);
        setAccessToken(null);
        syncedRef.current = false;
        delete api.defaults.headers.common['Authorization'];
      }
    }
  }, [isLoading, isAuthenticated, auth0User, getAccessTokenSilently]);

  const login = useCallback(async () => {
    try {
      setError(null);
      await loginWithRedirect();
      return { success: true };
    } catch (err) {
      setError(err.message || 'Login failed');
      return { success: false, error: err.message };
    }
  }, [loginWithRedirect]);

  const logout = useCallback(() => {
    setBackendUser(null);
    setAccessToken(null);
    syncedRef.current = false;
    delete api.defaults.headers.common['Authorization'];
    
    auth0Logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  }, [auth0Logout]);

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

  const updateProfile = useCallback(async (data) => {
    try {
      const response = await api.put('/auth/profile', data);
      setBackendUser(response.data.data);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Profile update failed' };
    }
  }, []);

  // Use Auth0 user directly for display, backend user for ID
  const user = isAuthenticated ? (backendUser || auth0User) : null;

  const value = {
    user,
    loading: isLoading,
    error: error || auth0Error?.message,
    isAuthenticated,
    accessToken,
    login,
    logout,
    getToken,
    updateProfile,
    clearError: () => setError(null),
    auth0User,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
