/**
 * Auth Context - Minimal Auth0 Wrapper
 * Just wraps Auth0 hooks and provides user/auth state
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
    isAuthenticated,
    isLoading,
    user: auth0User,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0();

  const [accessToken, setAccessToken] = useState(null);
  const tokenFetchedRef = useRef(false);

  // Get token when authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading && !tokenFetchedRef.current) {
      tokenFetchedRef.current = true;
      getAccessTokenSilently()
        .then(token => {
          setAccessToken(token);
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        })
        .catch(err => console.error('Token error:', err));
    }
    
    if (!isAuthenticated && !isLoading) {
      tokenFetchedRef.current = false;
      setAccessToken(null);
      delete api.defaults.headers.common['Authorization'];
    }
  }, [isAuthenticated, isLoading, getAccessTokenSilently]);

  const login = useCallback(() => {
    loginWithRedirect();
  }, [loginWithRedirect]);

  const logout = useCallback(() => {
    tokenFetchedRef.current = false;
    setAccessToken(null);
    delete api.defaults.headers.common['Authorization'];
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });
  }, [auth0Logout]);

  // Use Auth0 user directly
  const user = isAuthenticated ? auth0User : null;

  return (
    <AuthContext.Provider value={{
      user,
      loading: isLoading,
      isAuthenticated,
      accessToken,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
