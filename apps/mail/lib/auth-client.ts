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
  
  if (error?.message?.includes('500')) {
    return {
      type: 'server_error',
      message: 'Authentication service is currently unavailable. Please try again later.',
      details: 'Server returned 500 error - check Google OAuth configuration'
    };
  }
  
  if (error?.message?.includes('404')) {
    return {
      type: 'not_found',
      message: 'Authentication endpoint not found. Please check server configuration.',
      details: 'Auth endpoint returned 404'
    };
  }
  
  return {
    type: 'unknown',
    message: 'Authentication failed. Please try again.',
    details: error?.message || 'Unknown authentication error'
  };
};

export const { signIn, signUp, signOut, useSession, getSession, $fetch } = authClient;
export type Session = Awaited<ReturnType<Auth['api']['getSession']>>;
