import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { SessionProvider } from './context/SessionContext';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

/**
 * Auth0 Configuration
 * Auth0Provider wraps the entire app to provide authentication context.
 * - domain: Auth0 tenant domain
 * - clientId: Application client ID from Auth0 dashboard
 * - authorizationParams: Includes redirect URI and API audience for access tokens
 */
const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN;
const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const auth0Audience = import.meta.env.VITE_AUTH0_AUDIENCE;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Auth0Provider
      domain={auth0Domain}
      clientId={auth0ClientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: auth0Audience,
        scope: 'openid profile email',
      }}
      cacheLocation="localstorage"
    >
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <SessionProvider>
              <App />
            </SessionProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </Auth0Provider>
  </React.StrictMode>
);
