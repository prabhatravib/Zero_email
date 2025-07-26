import React from 'react';

// Custom auth client for Gmail OAuth only
// Use relative URLs to go through the frontend proxy
const BACKEND_URL = ''; // Empty string means relative URLs

// Debug: Log the backend URL being used
console.log('Auth client - Using relative URLs for frontend proxy');
console.log('Auth client - All env vars:', import.meta.env);

export const authClient = {
  baseURL: BACKEND_URL,
  fetchOptions: {
    credentials: 'include',
  },
};

// Simplified Gmail OAuth sign-in function
export const signIn = {
  social: async ({ provider, callbackURL }: { provider: string; callbackURL: string }) => {
    try {
      console.log('Making Gmail OAuth request to: /api/auth/sign-in/social');
      
      const response = await fetch(`/api/auth/sign-in/social`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ provider }),
        credentials: 'include',
      });

      console.log('Gmail OAuth response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gmail OAuth error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Gmail OAuth response data:', data);
      
      if (data.url) {
        // Redirect to Google OAuth
        console.log('Redirecting to Google OAuth:', data.url);
        window.location.href = data.url;
      } else {
        throw new Error('No OAuth URL received from server');
      }
    } catch (error) {
      console.error('Gmail OAuth failed:', error);
      throw error;
    }
  },
};

// Simplified session management
export const getSession = async () => {
  try {
    console.log('Making session request to: /api/auth/get-session');
    
    // Get session token from localStorage for cross-domain access
    const sessionToken = localStorage.getItem('gmail_session_token');
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    
    // Add session token to headers if available
    if (sessionToken) {
      headers['X-Session-Token'] = sessionToken;
    }
    
    const response = await fetch(`/api/auth/get-session`, {
      method: 'GET',
      headers,
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

// Enhanced error handling for Gmail authentication
export const handleAuthError = (error: any) => {
  console.error('Gmail authentication error:', error);
  
  // Check for specific error types
  if (error?.message?.includes('500')) {
    return {
      type: 'server_error',
      message: 'Gmail authentication service is currently unavailable.',
      details: 'Server returned 500 error - check Google OAuth configuration',
      action: 'Please try again or contact support if the issue persists.'
    };
  }
  
  if (error?.message?.includes('404')) {
    return {
      type: 'not_found',
      message: 'Gmail authentication endpoint not found.',
      details: 'Auth endpoint returned 404',
      action: 'Please check if the server is running properly.'
    };
  }

  if (error?.message?.includes('OAuth Configuration Error')) {
    return {
      type: 'oauth_config_error',
      message: 'Gmail OAuth is not properly configured.',
      details: 'Missing or invalid Google OAuth credentials',
      action: 'Please contact support to fix the Gmail integration.'
    };
  }
  
  return {
    type: 'unknown',
    message: 'Gmail authentication failed. Please try again.',
    details: error?.message || 'Unknown authentication error',
    action: 'If this persists, please contact support.'
  };
};

// Simplified sign-out function
export const signOut = async () => {
  try {
    console.log('Signing out...');
    // Clear session token from localStorage
    localStorage.removeItem('gmail_session_token');
    console.log('Sign out successful');
  } catch (error) {
    console.error('Sign out error:', error);
  }
};

export const signUp = signIn; // For compatibility
export const $fetch = fetch; // For compatibility

export type Session = any; // Simplified for now
