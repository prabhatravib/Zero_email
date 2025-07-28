// Custom auth proxy for Gmail OAuth only
// Use relative URLs to go through the frontend proxy
const BACKEND_URL = import.meta.env.VITE_PUBLIC_BACKEND_URL || 'https://pitext-mail.prabhatravib.workers.dev';

// Debug: Log the backend URL being used
console.log('Auth proxy - Using relative URLs for frontend proxy');
console.log('Auth proxy - All env vars:', import.meta.env);

export const authProxy = {
  api: {
    getSession: async ({ headers }: { headers: Headers }) => {
      try {
        console.log('Auth proxy - Making session request to: /api/auth/get-session');
        
        // Get JWT session token from localStorage
        const sessionToken = localStorage.getItem('gmail_session_token');
        
        const requestHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        // Add JWT session token to headers if available
        if (sessionToken) {
          requestHeaders['X-Session-Token'] = sessionToken;
          console.log('Auth proxy - Sending JWT session token in headers');
        } else {
          console.log('Auth proxy - No session token found');
        }
  
        const response = await fetch('/api/auth/get-session', {
          method: 'GET',
          headers: requestHeaders,
          credentials: 'include',
        });

        console.log('Auth proxy - Session response status:', response.status);

        if (!response.ok) {
          console.error('Auth proxy - Session request failed:', response.status, response.statusText);
          return null;
        }

        const sessionData = await response.json();
        console.log('Auth proxy - Session data received:', sessionData);
        return sessionData;
      } catch (error) {
        console.error('Auth proxy - Session request error:', error);
        return null;
      }
    },
  },
};
