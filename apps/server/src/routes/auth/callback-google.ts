import { config } from '../../config';
import type { HonoContext } from '../../ctx';

export const googleCallbackHandler = async (c: HonoContext) => {
    // Handle Google OAuth callback
    const code = c.req.query('code');
    const error = c.req.query('error');

    if (error) {
        console.error('Google OAuth error from Google:', error);
        return c.json({ 
            error: true, 
            message: error 
        }, 400);
    }

    if (!code) {
        console.error('No authorization code received from Google');
        return c.json({ 
            error: true, 
            message: 'No authorization code received' 
        }, 400);
    }

    try {
        console.log('Processing Google OAuth callback with code:', code);
        
        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                code,
                client_id: config.google.clientId,
                client_secret: config.google.clientSecret,
                redirect_uri: config.google.redirectUri,
                grant_type: 'authorization_code',
            }),
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error('Token exchange failed:', errorText);
            return c.json({ 
                error: true, 
                message: 'Token exchange failed' 
            }, 400);
        }

        const tokenData = await tokenResponse.json() as {
            access_token: string;
            refresh_token: string;
            expires_in: number;
        };
        console.log('Token exchange successful');

        // Get user info
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        });

        if (!userResponse.ok) {
            const errorText = await userResponse.text();
            console.error('User info fetch failed:', errorText);
            return c.json({ 
                error: true, 
                message: 'Failed to get user info' 
            }, 400);
        }

        const userData = await userResponse.json() as {
            email: string;
            name: string;
            picture: string;
        };
        console.log('User info fetched:', userData.email);

        // Return JSON response instead of redirecting
        return c.json({
            success: true,
            user: {
                email: userData.email,
                name: userData.name,
                picture: userData.picture,
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_in: tokenData.expires_in
            }
        });

    } catch (error) {
        console.error('OAuth callback error:', error);
        // Provide more specific error information
        let errorType = 'callback_error';
        if (error instanceof Error) {
            if (error.message.includes('fetch')) {
                errorType = 'network_error';
            } else if (error.message.includes('JSON')) {
                errorType = 'parse_error';
            }
        }
        return c.json({ 
            error: true, 
            message: errorType 
        }, 500);
    }
}; 