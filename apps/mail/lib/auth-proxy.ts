// Custom auth proxy for our new endpoints
// Force the correct backend URL to fix CORS issues
const BACKEND_URL = 'https://pitext-email.onrender.com';

// Debug: Log the backend URL being used
console.log('Auth proxy - BACKEND_URL from env:', BACKEND_URL);
console.log('Auth proxy - All env vars:', import.meta.env);

export const authProxy = {
  api: {
    getSession: async ({ headers }: { headers: Headers }) => {
      try {
        console.log('Auth proxy - Making session request to:', `${BACKEND_URL}/api/auth/get-session`);
        
        // For cross-domain setup, we need to send the session token from the frontend cookie
        const cookies = document.cookie;
        console.log('Auth proxy - Frontend cookies:', cookies);
        
        const sessionCookie = cookies.split(';')
          .find(cookie => cookie.trim().startsWith('session='))
          ?.split('=')[1];
        
        console.log('Auth proxy - Session cookie from frontend:', sessionCookie ? 'found' : 'not found');
        
        // Create headers with the session token
        const requestHeaders = new Headers();
        if (sessionCookie) {
          requestHeaders.set('X-Session-Token', sessionCookie);
        }
        
        const response = await fetch(`${BACKEND_URL}/api/auth/get-session`, {
          method: 'GET',
          headers: requestHeaders,
          credentials: 'include',
        });

        console.log('Auth proxy - Response status:', response.status);

        if (!response.ok) {
          console.error(`Failed to get session: HTTP ${response.status}`);
          return null;
        }

        const data = await response.json();
        console.log('Auth proxy - Response data:', data);
        return data.user;
      } catch (error) {
        console.error('Failed to get session:', error);
        return null;
      }
    },
  },
};
