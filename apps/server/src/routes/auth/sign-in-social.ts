import { getGoogleOAuthUrl } from '../../config';
import type { HonoContext } from '../../ctx';

export const signInSocialHandler = async (c: HonoContext) => {
    try {
        // Set proper headers to prevent content decoding issues
        c.header('Content-Type', 'application/json');
        c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        c.header('Pragma', 'no-cache');
        c.header('Expires', '0');
        
        let body;
        let rawBody;
        try {
            rawBody = await c.req.text();
            console.log('Raw request body received:', rawBody);
            
            if (!rawBody) {
                console.log('No request body received');
                return c.json({ error: 'No request body provided' }, 400);
            }
            
            body = JSON.parse(rawBody);
            console.log('Social sign-in request body:', JSON.stringify(body, null, 2));
            console.log('Social sign-in request body type:', typeof body);
            console.log('Social sign-in request body.provider:', body?.provider);
        } catch (parseError) {
            console.error('Failed to parse request body as JSON:', parseError);
            console.log('Raw request body that failed to parse:', rawBody);
            return c.json({ error: 'Invalid JSON in request body' }, 400);
        }
        
        if (body.provider === 'google') {
            console.log('Processing Google OAuth request...');
            
            const env = c.env as unknown as Record<string, string>;
            console.log('Environment variables available:', Object.keys(env).filter(key => key.includes('GOOGLE')));
            console.log('GOOGLE_CLIENT_ID:', env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET');
            console.log('GOOGLE_CLIENT_SECRET:', env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');
            
            try {
                const authUrl = getGoogleOAuthUrl(env);
                console.log('Generated Google OAuth URL:', authUrl);
                return c.json({ url: authUrl });
            } catch (urlError) {
                console.error('Error generating OAuth URL:', urlError);
                return c.json({ error: 'Failed to generate OAuth URL', details: urlError instanceof Error ? urlError.message : 'Unknown error' }, 500);
            }
        }
        
        return c.json({ error: 'Unsupported provider' }, 400);
    } catch (error) {
        console.error('Social sign-in error:', error);
        let errorMessage = 'Unknown error';
        
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        } else if (error && typeof error === 'object') {
            errorMessage = JSON.stringify(error);
        }
        
        return c.json({ error: 'Internal server error', details: errorMessage }, 500);
    }
}; 