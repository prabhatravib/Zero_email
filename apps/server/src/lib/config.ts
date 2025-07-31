import { env } from 'cloudflare:workers';

export interface AppConfig {
  auth: {
    secret: string;
    cookieDomain: string;
  };
  database: {
    d1Binding: string;
  };
  mail: {
    maxResults: number;
    timeoutMs: number;
  };
}

export function getConfig(): AppConfig {
  const config: AppConfig = {
    auth: {
      secret: env.BETTER_AUTH_SECRET || '',
      cookieDomain: env.COOKIE_DOMAIN || 'localhost',
    },
    database: {
      d1Binding: 'DB',
    },
    mail: {
      maxResults: 100,
      timeoutMs: 30000, // 30 seconds
    },
  };

  // Validate required configuration
  const missingConfigs: string[] = [];
  
  if (!config.auth.secret) {
    missingConfigs.push('BETTER_AUTH_SECRET');
  }
  
  if (missingConfigs.length > 0) {
    console.error('Missing required environment variables:', missingConfigs.join(', '));
    console.error('Please check your wrangler.jsonc configuration');
  }

  return config;
}

export const config = getConfig(); 