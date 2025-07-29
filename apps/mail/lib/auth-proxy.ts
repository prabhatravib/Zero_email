// Simple auth proxy that doesn't break the app
export const authProxy = {
  api: {
    getSession: async ({ headers }: { headers: Headers }) => {
      try {
        // For now, return null to prevent app from breaking
        // This will be replaced with actual auth implementation later
        console.log('Auth proxy called - returning null for now');
        return null;
      } catch (error) {
        console.error('Auth proxy error:', error);
        return null;
      }
    },
  },
};
