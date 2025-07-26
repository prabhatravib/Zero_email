import { validateGoogleOAuthConfig } from '../lib/auth';
import type { HonoContext } from '../ctx';

export const debugBetterAuthHandler = async (c: HonoContext) => {
    try {
        const env = c.env as unknown as Record<string, string>;
        
        // Test environment variable validation
        validateGoogleOAuthConfig(env);
        
        return c.json({
            success: true,
            message: 'Google OAuth configuration validated successfully',
            envVars: {
                GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET',
                GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET',
                VITE_PUBLIC_BACKEND_URL: env.VITE_PUBLIC_BACKEND_URL || 'NOT SET',
            }
        });
    } catch (error) {
        console.error('OAuth config validation error:', error);
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        }, 500);
    }
}; 