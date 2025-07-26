import { createConfig } from '../../config';
import type { HonoContext } from '../../ctx';

export const googleCallbackHandler = async (c: any) => {
    const env = c.env as unknown as Record<string, string>;
    
    // Debug environment variables
    console.log('🔍 googleCallbackHandler - Environment variables check:');
    console.log('env.GOOGLE_CLIENT_ID:', env?.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET');
    console.log('env.GOOGLE_CLIENT_SECRET:', env?.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');
    console.log('env.GOOGLE_REDIRECT_URI:', env?.GOOGLE_REDIRECT_URI);
    
    // Check if environment variables are accessible
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
        console.error('Google OAuth credentials not accessible in callback handler');
        return c.redirect(`https://pitext-email.onrender.com/auth/callback/google?error=${encodeURIComponent('oauth_config_error')}`);
    }
    
    const config = createConfig(env);
    
    // Debug config
    console.log('🔍 googleCallbackHandler - Config created:');
    console.log('config.google.clientId:', config.google.clientId);
    console.log('config.google.clientSecret:', config.google.clientSecret ? 'SET' : 'NOT SET');
    console.log('config.google.redirectUri:', config.google.redirectUri);
    
    // Handle Google OAuth callback
    const code = c.req.query('code');
    const error = c.req.query('error');

    if (error) {
        console.error('Google OAuth error from Google:', error);
        return c.redirect(`${config.app.publicUrl}/auth/callback/google?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
        console.error('No authorization code received from Google');
        return c.redirect(`${config.app.publicUrl}/auth/callback/google?error=no_code`);
    }

    try {
        console.log('Processing Google OAuth callback with code:', code);
        console.log('Using config:', {
            clientId: config.google.clientId ? 'SET' : 'NOT SET',
            clientSecret: config.google.clientSecret ? 'SET' : 'NOT SET',
            redirectUri: config.google.redirectUri,
            publicUrl: config.app.publicUrl
        });
        
        // Log the actual client ID being used (first few characters for security)
        const clientId = config.google.clientId;
        const maskedClientId = clientId ? `${clientId.substring(0, 10)}...${clientId.substring(clientId.length - 10)}` : 'NOT SET';
        console.log('Client ID being used in token exchange:', maskedClientId);
        console.log('Expected client ID from frontend:', '363401296279-vo7al766jmct0gcat24rrn2grv2jh1p5.apps.googleusercontent.com');
        
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

        console.log('Token exchange response status:', tokenResponse.status);
        console.log('Token exchange response headers:', Object.fromEntries(tokenResponse.headers.entries()));

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error('Token exchange failed with status:', tokenResponse.status);
            console.error('Token exchange error response:', errorText);
            
            // Try to parse the error response as JSON for more details
            try {
                const errorJson = JSON.parse(errorText);
                console.error('Parsed error response:', errorJson);
                
                // Return more specific error based on Google's error response
                if (errorJson.error) {
                    return c.redirect(`${config.app.publicUrl}/auth/callback/google?error=${encodeURIComponent(errorJson.error)}&error_description=${encodeURIComponent(errorJson.error_description || '')}`);
                }
            } catch (parseError) {
                console.error('Failed to parse error response as JSON:', parseError);
            }
            
            return c.redirect(`${config.app.publicUrl}/auth/callback/google?error=token_exchange_failed&status=${tokenResponse.status}`);
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
            return c.redirect(`${config.app.publicUrl}/auth/callback/google?error=user_info_failed`);
        }

        const userData = await userResponse.json() as {
            email: string;
            name: string;
            picture: string;
        };
        console.log('User info fetched:', userData.email);

        // Create a proper session token with the actual access token
        const sessionData = {
            email: userData.email,
            name: userData.name,
            picture: userData.picture,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: Date.now() + (tokenData.expires_in * 1000)
        };
        
        // Encode the session data as base64 for the frontend
        const sessionToken = btoa(JSON.stringify(sessionData));
        
        // Redirect with the actual session token
        const successUrl = `${config.app.publicUrl}/auth/callback/google?success=true&email=${encodeURIComponent(userData.email)}&name=${encodeURIComponent(userData.name)}&picture=${encodeURIComponent(userData.picture)}&session=${encodeURIComponent(sessionToken)}`;
        
        console.log('Redirecting to frontend with success and session token');
        return c.redirect(successUrl);

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
        return c.redirect(`${config.app.publicUrl}/auth/callback/google?error=${encodeURIComponent(errorType)}`);
    }
}; 