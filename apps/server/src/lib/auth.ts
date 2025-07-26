import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { jwt, bearer } from 'better-auth/plugins';
import { getSocialProviders } from './auth-providers';

export const createAuth = (env: any) => {
  // Fail hard if Google OAuth credentials are not properly configured
  const requiredEnvVars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
  
  // Debug: Log the actual values
  console.log('🔍 Debug - Environment variables:');
  console.log('GOOGLE_CLIENT_ID:', env.GOOGLE_CLIENT_ID);
  console.log('GOOGLE_CLIENT_SECRET:', env.GOOGLE_CLIENT_SECRET ? 'SET (length: ' + env.GOOGLE_CLIENT_SECRET.length + ')' : 'NOT SET');
  
  const missingVars = requiredEnvVars.filter(varName => {
    const value = env[varName as keyof typeof env];
    return !value || value === '' || value.startsWith('REPLACE_WITH_') || value.startsWith('YOUR_ACTUAL_');
  });

  if (missingVars.length > 0) {
    const errorMessage = `CRITICAL: Google OAuth credentials not configured. Missing or invalid: ${missingVars.join(', ')}. 
    
To fix this:
1. Go to Google Cloud Console (https://console.cloud.google.com)
2. Create a new project or select existing project
3. Enable Gmail API and Google+ API
4. Create OAuth 2.0 credentials
5. Set the authorized redirect URI to: https://pitext-mail.prabhatravib.workers.dev/api/auth/callback/google
6. Add the credentials in Cloudflare Workers dashboard (NOT in wrangler.jsonc for security)

Current configuration:
- GOOGLE_CLIENT_ID: ${env.GOOGLE_CLIENT_ID || 'NOT SET (add in Cloudflare dashboard)'}
- GOOGLE_CLIENT_SECRET: ${env.GOOGLE_CLIENT_SECRET ? 'SET (but may be invalid)' : 'NOT SET (add in Cloudflare dashboard)'}

IMPORTANT: Do NOT add credentials to wrangler.jsonc as they will be committed to GitHub.`;

    console.error(errorMessage);
    throw new Error(`OAuth Configuration Error: ${missingVars.join(', ')} not properly configured`);
  }

  console.log('✅ Google OAuth credentials validated successfully');

  const plugins = [
    jwt(),
    bearer(),
  ];

  return betterAuth({
    plugins,
    user: {
      fields: {
        name: 'string',
        email: 'string',
        image: 'string',
      },
    },
    // Minimal database - just return basic objects
    database: {
      async createUser() { return { id: 'temp-user-' + Date.now() }; },
      async getUser() { return null; },
      async getUserByEmail() { return null; },
      async getUserByAccount() { return null; },
      async updateUser() { return { id: 'temp-user' }; },
      async deleteUser() { return { id: 'temp-user' }; },
      async linkAccount() { return { id: 'temp-account' }; },
      async unlinkAccount() { return { id: 'temp-account' }; },
      async createSession() { return { id: 'temp-session' }; },
      async getSession() { return null; },
      async updateSession() { return { id: 'temp-session' }; },
      async deleteSession() { return { id: 'temp-session' }; },
      async createVerificationToken() { return { id: 'temp-token' }; },
      async useVerificationToken() { return null; },
    },
    // Minimal configuration
    advanced: {
      ipAddress: {
        disableIpTracking: true,
      },
      cookiePrefix: 'better-auth',
      crossSubDomainCookies: {
        enabled: false,
      },
    },
    baseURL: env.BETTER_AUTH_URL || 'https://pitext-mail.prabhatravib.workers.dev',
    trustedOrigins: [
      'https://pitext-email.onrender.com',
      'http://localhost:3000',
    ],
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24 * 3, // 3 days
    },
    socialProviders: getSocialProviders(env as unknown as Record<string, string>),
    account: {
      accountLinking: {
        enabled: false,
      },
    },
    onAPIError: {
      onError: (error) => {
        console.error('API Error', error);
      },
      errorURL: `${env.VITE_PUBLIC_APP_URL}/login`,
      throw: false, // Don't throw, just log
    },
  } satisfies BetterAuthOptions);
};

export type Auth = ReturnType<typeof createAuth>;
