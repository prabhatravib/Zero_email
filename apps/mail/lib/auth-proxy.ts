// Custom auth proxy for our new endpoints
const BACKEND_URL = import.meta.env.VITE_PUBLIC_BACKEND_URL;

export const authProxy = {
  api: {
    getSession: async ({ headers }: { headers: Headers }) => {
      try {
        console.log('Auth proxy - Making session request to:', `${BACKEND_URL}/api/auth/get-session`);
        
        // For cross-domain setup, we need to send the session token from the frontend cookie
        const cookies = document.cookie;
        console.log('Auth proxy - Frontend cookies:', cookies);
        
        // Get the first session cookie (avoid duplicates)
        const sessionCookies = cookies.split(';')
          .filter(cookie => cookie.trim().startsWith('session='));
        
        const sessionCookie = sessionCookies.length > 0 
          ? sessionCookies[0].split('=')[1] 
          : null;
        
        console.log('Auth proxy - Session cookies found:', sessionCookies.length);
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
