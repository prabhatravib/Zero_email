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
        console.log('Auth proxy - Making session request to: /api/auth/get-session');
        
        // Session is now managed via HTTP-only cookies, so we just need to make the request
        // The browser will automatically include the session cookie
        const response = await fetch('/api/auth/get-session', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // This ensures cookies are sent
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
