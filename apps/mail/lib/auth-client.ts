import React from 'react';

// Custom auth client for unified Google OAuth flow
const BACKEND_URL = 'https://pitext-mail.prabhatravib.workers.dev';

export const authClient = {
  baseURL: BACKEND_URL,
  fetchOptions: {
    credentials: 'include',
  },
  
  // Add linkSocial method for Gmail-only support
  linkSocial: async ({ provider, callbackURL }: { provider: string; callbackURL: string }) => {
    if (provider === 'google') {
      // Use the unified Google OAuth flow
      window.location.href = `${BACKEND_URL}/auth/google/login`;
    } else {
      throw new Error(`Provider ${provider} is not supported. Only Gmail is currently available.`);
    }
  },
};

// Simplified unified Google OAuth sign-in function
export const signIn = {
  google: async () => {
    try {
      console.log('Redirecting to unified Google OAuth...');
      window.location.href = `${BACKEND_URL}/auth/google/login`;
    } catch (error) {
      console.error('Google OAuth redirect failed:', error);
      throw error;
    }
  },
  
  // Keep social for backward compatibility
  social: async ({ provider, callbackURL }: { provider: string; callbackURL: string }) => {
    if (provider === 'google') {
      return signIn.google();
    }
    throw new Error(`Unsupported provider: ${provider}`);
  },
};

// Session management using cookies
export const getSession = async () => {
  try {
    // Check if we have a session cookie by making a request to the backend
    const response = await fetch(`${BACKEND_URL}/auth/session`, {
      method: 'GET',
      credentials: 'include', // This will include the session cookie
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const sessionData = await response.json();
      return sessionData.user; // Return the user data from the response
    }

    // If no valid session, return null
    return null;
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
};

// Simplified useSession hook
export const useSession = () => {
  const [session, setSession] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getSession().then((user) => {
      setSession(user);
      setLoading(false);
    });
  }, []);

  return { data: session, isLoading: loading };
};

// Enhanced error handling for Google authentication
export const handleAuthError = (error: any) => {
  console.error('Google authentication error:', error);
  
  // Check for specific error types
  if (error?.message?.includes('500')) {
    return {
      type: 'server_error',
      message: 'Google authentication service is currently unavailable.',
      details: 'Server returned 500 error - check Google OAuth configuration',
      action: 'Please try again or contact support if the issue persists.'
    };
  }
  
  if (error?.message?.includes('404')) {
    return {
      type: 'not_found',
      message: 'Google authentication endpoint not found.',
      details: 'Auth endpoint returned 404',
      action: 'Please check if the server is running properly.'
    };
  }

  if (error?.message?.includes('OAuth Configuration Error')) {
    return {
      type: 'oauth_config_error',
      message: 'Google OAuth is not properly configured.',
      details: 'Missing or invalid Google OAuth credentials',
      action: 'Please contact support to fix the Gmail integration.'
    };
  }
  
  if (error?.message?.includes('jwt_config_error')) {
    return {
      type: 'jwt_config_error',
      message: 'Session token configuration error.',
      details: 'JWT secret not configured on server',
      action: 'Please contact support to fix the session configuration.'
    };
  }
  
  return {
    type: 'unknown',
    message: 'Google authentication failed. Please try again.',
    details: error?.message || 'Unknown authentication error',
    action: 'If this persists, please contact support.'
  };
};

// Simplified sign-out function
export const signOut = async () => {
  try {
    console.log('Signing out...');
    
    // Call backend to invalidate session
    await fetch(`${BACKEND_URL}/auth/signout`, {
      method: 'POST',
      credentials: 'include',
    });
    
    // Clear any local storage
    localStorage.removeItem('gmail_user_data');
    localStorage.removeItem('gmail_session_token');
    
    console.log('Sign out successful');
  } catch (error) {
    console.error('Sign out error:', error);
  }
};

export const signUp = signIn; // For compatibility
export const $fetch = fetch; // For compatibility

export type Session = any; // Simplified for now
