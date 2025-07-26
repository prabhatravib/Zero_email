import type { HonoContext } from '../ctx';

export const debugHandler = (c: HonoContext) => {
    const env = c.env as any;
    
    return c.json({ 
        message: 'Debug endpoint',
        env: {
            GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID ? 'set' : 'not set',
            GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET ? 'set' : 'not set',
            VITE_PUBLIC_APP_URL: env.VITE_PUBLIC_APP_URL,
            GOOGLE_REDIRECT_URI: env.GOOGLE_REDIRECT_URI,
            NODE_ENV: env.NODE_ENV,
            BETTER_AUTH_URL: env.BETTER_AUTH_URL,
            BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET ? 'set' : 'not set'
        }
    });
}; 