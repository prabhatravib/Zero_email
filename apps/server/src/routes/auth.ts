import { authProviders, customProviders, isProviderEnabled } from '../lib/auth-providers';
import type { HonoContext } from '../ctx';
import { Hono } from 'hono';

const publicRouter = new Hono<HonoContext>();

publicRouter.get('/providers', async (c) => {
  const env = c.env as unknown as Record<string, string>;
  const isProd = env.NODE_ENV === 'production';

  const authProviderStatus = authProviders(env).map((provider) => {
    const envVarStatus =
      provider.envVarInfo?.map((envVar) => {
        const envVarName = envVar.name as keyof typeof env;
        return {
          name: envVar.name,
          set: !!env[envVarName],
          source: envVar.source,
          defaultValue: envVar.defaultValue,
        };
      }) || [];

    return {
      id: provider.id,
      name: provider.name,
      enabled: isProviderEnabled(provider, env),
      required: provider.required,
      envVarInfo: provider.envVarInfo,
      envVarStatus,
    };
  });

  const customProviderStatus = customProviders.map((provider) => {
    return {
      id: provider.id,
      name: provider.name,
      enabled: true,
      isCustom: provider.isCustom,
      customRedirectPath: provider.customRedirectPath,
      envVarStatus: [],
    };
  });

  const allProviders = [...customProviderStatus, ...authProviderStatus];

  return c.json({
    allProviders,
    isProd,
  });
});

// Add configuration check endpoint
publicRouter.get('/config-check', async (c) => {
  const env = c.env as unknown as Record<string, string>;
  
  const configStatus = {
    environment: env.NODE_ENV || 'development',
    backendUrl: env.VITE_PUBLIC_BACKEND_URL,
    cookieDomain: env.COOKIE_DOMAIN,
    betterAuthSecret: !!env.BETTER_AUTH_SECRET,
    betterAuthUrl: env.BETTER_AUTH_URL,
    googleClientId: {
      set: !!env.GOOGLE_CLIENT_ID,
      value: env.GOOGLE_CLIENT_ID?.startsWith('REPLACE_WITH_') ? 'PLACEHOLDER' : 'SET',
    },
    googleClientSecret: {
      set: !!env.GOOGLE_CLIENT_SECRET,
      value: env.GOOGLE_CLIENT_SECRET?.startsWith('REPLACE_WITH_') ? 'PLACEHOLDER' : 'SET',
    },
    googleRedirectUri: env.GOOGLE_REDIRECT_URI,
    issues: [] as string[],
  };

  // Check for configuration issues
  if (!env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID.startsWith('REPLACE_WITH_')) {
    configStatus.issues.push('Google Client ID is not configured');
  }
  
  if (!env.GOOGLE_CLIENT_SECRET || env.GOOGLE_CLIENT_SECRET.startsWith('REPLACE_WITH_')) {
    configStatus.issues.push('Google Client Secret is not configured');
  }
  
  if (!env.BETTER_AUTH_SECRET) {
    configStatus.issues.push('Better Auth Secret is not configured');
  }

  return c.json(configStatus);
});

export { publicRouter };
