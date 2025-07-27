import type { HonoContext } from '../../ctx';

export const signInSocialHandler = async (c: any) => {
    try {
        const body = await c.req.json();
        const { provider } = body;

        if (!provider) {
            return c.json({ error: 'Provider is required' }, 400);
        }

        if (provider !== 'google') {
            return c.json({ error: 'Only Google provider is supported' }, 400);
        }

        const env = c.env as any;
        const publicUrl = env.VITE_PUBLIC_APP_URL || 'https://pitext-email.onrender.com';
        
        // Redirect to the unified Google OAuth flow
        const authUrl = `${env.VITE_PUBLIC_BACKEND_URL || 'https://pitext-mail.prabhatravib.workers.dev'}/auth/google/login`;
        
        return c.json({ 
            success: true, 
            redirectUrl: authUrl,
            message: 'Redirecting to Google OAuth'
        });
        
    } catch (error) {
        console.error('Sign-in social error:', error);
        return c.json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
    }
}; 