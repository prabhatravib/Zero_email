import type { HonoContext } from '../ctx';

export const debugEnvHandler = async (c: HonoContext) => {
    try {
        const env = c.env as unknown as Record<string, string>;
        
        console.log('🔍 Debug - Environment variables in handler:');
        console.log('GOOGLE_CLIENT_ID:', env.GOOGLE_CLIENT_ID);
        console.log('GOOGLE_CLIENT_SECRET:', env.GOOGLE_CLIENT_SECRET ? 'SET (length: ' + env.GOOGLE_CLIENT_SECRET.length + ')' : 'NOT SET');
        console.log('VITE_PUBLIC_BACKEND_URL:', env.VITE_PUBLIC_BACKEND_URL);
        console.log('BETTER_AUTH_SECRET:', env.BETTER_AUTH_SECRET ? 'SET' : 'NOT SET');
        
        return c.json({
            success: true,
            message: 'Environment variables debug info',
            envVars: {
                GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET',
                GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET',
                VITE_PUBLIC_BACKEND_URL: env.VITE_PUBLIC_BACKEND_URL || 'NOT SET',
                BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET ? 'SET' : 'NOT SET',
            },
            allEnvKeys: Object.keys(env).filter(key => key.includes('GOOGLE') || key.includes('AUTH') || key.includes('VITE'))
        });
    } catch (error) {
        console.error('Debug env error:', error);
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        }, 500);
    }
}; 