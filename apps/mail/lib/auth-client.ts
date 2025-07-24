import { phoneNumberClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import type { Auth } from '@zero/server/auth';

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_PUBLIC_BACKEND_URL,
  fetchOptions: {
    credentials: 'include',
  },
  plugins: [phoneNumberClient()],
});

// Enhanced error handling for authentication
export const handleAuthError = (error: any) => {
  console.error('Authentication error:', error);
  
  // Check for specific error types
  if (error?.message?.includes('500')) {
    return {
      type: 'server_error',
      message: 'Authentication service is currently unavailable. This is likely due to missing Google OAuth configuration.',
      details: 'Server returned 500 error - check Google OAuth configuration',
      action: 'Please contact support or check the server configuration.'
    };
  }
  
  if (error?.message?.includes('404')) {
    return {
      type: 'not_found',
      message: 'Authentication endpoint not found. Please check server configuration.',
      details: 'Auth endpoint returned 404',
      action: 'Verify the backend server is running and properly configured.'
    };
  }

  if (error?.message?.includes('OAuth Configuration Error')) {
    return {
      type: 'oauth_config_error',
      message: 'Google OAuth is not properly configured. Please contact support.',
      details: 'Missing or invalid Google OAuth credentials',
      action: 'The server needs proper Google OAuth setup to enable Gmail integration.'
    };
  }
  
  return {
    type: 'unknown',
    message: 'Authentication failed. Please try again.',
    details: error?.message || 'Unknown authentication error',
    action: 'If this persists, please contact support.'
  };
};

export const { signIn, signUp, signOut, useSession, getSession, $fetch } = authClient;
export type Session = Awaited<ReturnType<Auth['api']['getSession']>>;
