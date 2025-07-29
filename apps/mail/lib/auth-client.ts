// Placeholder for removed better-auth functionality
const phoneNumberClient = {
  // Placeholder implementation
};

const createAuthClient = () => ({
  // Placeholder implementation
});

import type { Auth } from '@zero/server/auth';

export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession, getSession, $fetch } = authClient;
export type Session = Awaited<ReturnType<Auth['api']['getSession']>>;
