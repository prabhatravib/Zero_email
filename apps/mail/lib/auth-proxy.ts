// Custom auth proxy for our new endpoints
const BACKEND_URL = import.meta.env.VITE_PUBLIC_BACKEND_URL;

export const authProxy = {
  api: {
    getSession: async ({ headers }: { headers: Headers }) => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/auth/get-session`, {
          method: 'GET',
          headers,
          credentials: 'include',
        });

        if (!response.ok) {
          console.error(`Failed to get session: HTTP ${response.status}`);
          return null;
        }

        const data = await response.json();
        return data.user;
      } catch (error) {
        console.error('Failed to get session:', error);
        return null;
      }
    },
  },
};
