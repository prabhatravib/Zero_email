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
        
        // Try to parse error response as JSON for better error details
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error && errorData.details) {
            throw new Error(`${errorData.error}: ${errorData.details}`);
          }
        } catch (parseError) {
          // If JSON parsing fails, use the raw error text
        }
        
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
    console.log('Getting session from localStorage');
    
    // First try to get session token (preferred method)
    const sessionToken = localStorage.getItem('gmail_session_token');
    
    if (sessionToken) {
      try {
        const sessionData = JSON.parse(atob(sessionToken));
        
        // Check if session is expired
        if (sessionData.expires_at && Date.now() > sessionData.expires_at) {
          console.log('Session token expired, clearing localStorage');
          localStorage.removeItem('gmail_session_token');
          localStorage.removeItem('gmail_user_data');
          return null;
        }
        
        console.log('Valid session token found:', sessionData.email);
        return {
          id: sessionData.email,
          email: sessionData.email,
          name: sessionData.name,
          image: sessionData.picture,
        };
      } catch (decodeError) {
        console.error('Failed to decode session token:', decodeError);
        localStorage.removeItem('gmail_session_token');
      }
    }
    
    // Fallback: Get user data from localStorage (legacy method)
    const userDataStr = localStorage.getItem('gmail_user_data');
    
    if (!userDataStr) {
      console.log('No user data found in localStorage');
      return null;
    }
    
    const userData = JSON.parse(userDataStr);
    
    // Check if user data is still valid (not expired)
    if (userData.authenticated && userData.timestamp) {
      const now = Date.now();
      const age = now - userData.timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (age < maxAge) {
        console.log('Valid user session found:', userData.email);
        return {
          id: userData.email,
          email: userData.email,
          name: userData.name,
          image: userData.picture,
        };
      } else {
        console.log('User session expired, clearing localStorage');
        localStorage.removeItem('gmail_user_data');
        return null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get session from localStorage:', error);
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
    // Clear all user data from localStorage
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
