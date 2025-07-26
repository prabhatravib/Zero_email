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
            const authUrl = getGoogleOAuthUrl();
            
            console.log('Generated Google OAuth URL:', authUrl);
            return c.json({ url: authUrl });
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