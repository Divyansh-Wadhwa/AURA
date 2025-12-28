/**
 * Auth0 Configuration
 * 
 * This file contains Auth0 configuration settings loaded from environment variables.
 * Never hardcode secrets - always use environment variables.
 */

export const auth0Config = {
  // Auth0 tenant domain (e.g., dev-xxxxx.us.auth0.com)
  domain: import.meta.env.VITE_AUTH0_DOMAIN,
  
  // Auth0 application client ID
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
  
  // API audience identifier for access token scope
  audience: import.meta.env.VITE_AUTH0_AUDIENCE,
  
  // Authorization parameters
  authorizationParams: {
    redirect_uri: typeof window !== 'undefined' ? window.location.origin : '',
    audience: import.meta.env.VITE_AUTH0_AUDIENCE,
    scope: 'openid profile email',
  },
};

/**
 * Validate Auth0 configuration
 * Throws error if required config is missing
 */
export const validateAuth0Config = () => {
  const required = ['domain', 'clientId'];
  const missing = required.filter(key => !auth0Config[key]);
  
  if (missing.length > 0) {
    console.error(`Missing Auth0 configuration: ${missing.join(', ')}`);
    console.error('Please set VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID in .env');
    return false;
  }
  return true;
};

export default auth0Config;
