// Custom auth proxy for Gmail OAuth only
// Use relative URLs to go through the frontend proxy
const BACKEND_URL = ''; // Empty string means relative URLs

// Debug: Log the backend URL being used
console.log('Auth proxy - Using relative URLs for frontend proxy');
console.log('Auth proxy - All env vars:', import.meta.env);

export const authProxy = {
  api: {
    getSession: async ({ headers }: { headers: Headers }) => {
      try {
        console.log('Auth proxy - Making session request to: /api/auth/session');
        
        // Get session token from localStorage for cross-domain access
        const sessionToken = localStorage.getItem('gmail_session_token');
        
        const requestHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        // Add session token to headers if available
        if (sessionToken) {
          console.log('Auth proxy - Session token found, length:', sessionToken.length);
          requestHeaders['X-Session-Token'] = sessionToken;
        }
        
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          headers: requestHeaders,
          credentials: 'include',
        });

        if (!response.ok) {
          console.error('Auth proxy - Session request failed:', response.status, response.statusText);
          return null;
        }

        const data = await response.json();
        console.log('Auth proxy - Session response:', data);
        
        return data.user;
      } catch (error) {
        console.error('Auth proxy - Error getting session:', error);
        return null;
      }
    },
  },
};
