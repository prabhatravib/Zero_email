// Placeholder for removed better-auth functionality
const createAuthClient = () => ({
  // Placeholder implementation
});

import type { Auth } from '@zero/server/auth';

const authClient = createAuthClient();

export const authProxy = {
  api: {
    getSession: async ({ headers }: { headers: Headers }) => {
      const session = await authClient.getSession({
        fetchOptions: { headers, credentials: 'include' },
      });
      if (session.error) {
        console.error(`Failed to get session: ${session.error}`, session);
        return null;
      }
      return session.data;
    },
  },
};
