import React from 'react';

// Custom auth client for our new endpoints
// Use environment variable for backend URL
const BACKEND_URL = import.meta.env.VITE_PUBLIC_BACKEND_URL || 'https://pitext-mail.prabhatravib.workers.dev';

// Debug: Log the backend URL being used
console.log('Auth client - BACKEND_URL from env:', BACKEND_URL);
console.log('Auth client - All env vars:', import.meta.env);

export const authClient = {
  baseURL: BACKEND_URL,
  fetchOptions: {
    credentials: 'include',
  },
};

// Custom sign-in function for Google OAuth
export const signIn = {
  social: async ({ provider, callbackURL }: { provider: string; callbackURL: string }) => {
    try {
      console.log('Making social sign-in request to:', `${BACKEND_URL}/api/auth/sign-in/social`);
      
      const response = await fetch(`${BACKEND_URL}/api/auth/sign-in/social`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider }),
        credentials: 'include',
      });

      console.log('Social sign-in response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Social sign-in error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Social sign-in response data:', data);
      
      if (data.url) {
        // Redirect to Google OAuth
        window.location.href = data.url;
      } else {
        throw new Error('No OAuth URL received from server');
      }
    } catch (error) {
      console.error('Social sign-in failed:', error);
      throw error;
    }
  },
};

// Custom session management
export const getSession = async () => {
  try {
    console.log('Making session request to:', `${BACKEND_URL}/api/auth/get-session`);
    
    const response = await fetch(`${BACKEND_URL}/api/auth/get-session`, {
      method: 'GET',
      credentials: 'include',
    });

    console.log('Session response status:', response.status);

    if (!response.ok) {
      console.error('Session request failed:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    console.log('Session response data:', data);
    return data.user;
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
};

// Custom useSession hook
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

export const signUp = signIn; // For compatibility
export const signOut = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/sign-out`, {
      method: 'POST',
      credentials: 'include',
    });
    
    if (response.ok) {
      console.log('Sign out successful');
    } else {
      console.error('Sign out failed:', response.statusText);
    }
  } catch (error) {
    console.error('Sign out error:', error);
  }
};

export const $fetch = fetch; // For compatibility

export type Session = any; // Simplified for now
