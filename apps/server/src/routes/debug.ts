import { createConfig } from '../config';
import type { HonoContext } from '../ctx';

export const debugHandler = (c: HonoContext) => {
    const env = c.env as unknown as Record<string, string>;
    const config = createConfig(env);
    
    return c.json({ 
        message: 'Debug endpoint',
        env: {
            GOOGLE_CLIENT_ID: config.google.clientId ? 'set' : 'not set',
            GOOGLE_CLIENT_SECRET: config.google.clientSecret ? 'set' : 'not set',
            VITE_PUBLIC_APP_URL: config.app.publicUrl,
            GOOGLE_REDIRECT_URI: config.google.redirectUri
        }
    });
}; 