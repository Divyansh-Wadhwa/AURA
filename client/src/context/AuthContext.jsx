/**
 * Auth Context - Minimal Auth0 Wrapper
 * Just wraps Auth0 hooks and provides user/auth state
 */
import { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { setTokenGetter } from '../services/api';

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

  // Set up token getter for API interceptor
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      // Set the token getter so API can get fresh tokens
      setTokenGetter(() => getAccessTokenSilently());
      
      // Also get initial token for state
      getAccessTokenSilently()
        .then(token => setAccessToken(token))
        .catch(err => console.error('Token error:', err));
    } else if (!isAuthenticated && !isLoading) {
      setTokenGetter(null);
      setAccessToken(null);
    }
  }, [isAuthenticated, isLoading, getAccessTokenSilently]);

  const login = useCallback(() => {
    loginWithRedirect();
  }, [loginWithRedirect]);

  const logout = useCallback(() => {
    setTokenGetter(null);
    setAccessToken(null);
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
