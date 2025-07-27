import { createConfig } from '../../config';
import type { HonoContext } from '../../ctx';
import jwt from '@tsndr/cloudflare-worker-jwt';

export const googleCallbackHandler = async (c: any) => {
    const env = c.env as unknown as Record<string, string>;
    
    // Debug environment variables
    console.log('🔍 googleCallbackHandler - Environment variables check:');
    console.log('env.GOOGLE_CLIENT_ID:', env?.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET');
    console.log('env.GOOGLE_CLIENT_SECRET:', env?.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');
    console.log('env.GOOGLE_REDIRECT_URI:', env?.GOOGLE_REDIRECT_URI);
    console.log('env.JWT_SECRET:', env?.JWT_SECRET ? 'SET' : 'NOT SET');
    
    // Check if environment variables are accessible
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
        console.error('Google OAuth credentials not accessible in callback handler');
        return c.redirect(`https://pitext-email.onrender.com/auth/callback/google?error=${encodeURIComponent('oauth_config_error')}`);
    }
    
    if (!env.JWT_SECRET) {
        console.error('JWT_SECRET not configured');
        return c.redirect(`https://pitext-email.onrender.com/auth/callback/google?error=${encodeURIComponent('jwt_config_error')}`);
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
            id: string;           // Google's unique user ID
            email: string;
            name: string;
            picture: string;
            verified_email: boolean;
        };
        console.log('User info fetched:', userData.email);

        // Create connection data
        const connectionId = `${userData.id}_${userData.email}`;
        const connectionData = {
            id: connectionId,
            userId: userData.id,
            email: userData.email,
            name: userData.name,
            picture: userData.picture,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify',
            providerId: 'google' as const,
            expiresAt: new Date(Date.now() + (tokenData.expires_in * 1000)),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // Store connection data in ZeroDB Durable Object
        try {
            const db = (env as any).ZERO_DB.get((env as any).ZERO_DB.idFromName(userData.id));
            await db.storeConnection(connectionData);
            console.log('Connection data stored in ZeroDB Durable Object');
        } catch (dbError) {
            console.error('Failed to store connection data in Durable Object:', dbError);
            // Continue with the flow even if storage fails
        }

        // Generate a proper JWT session token
        const sessionPayload = {
            userId: userData.id,        // Use Google's unique user ID
            email: userData.email,
            name: userData.name,
            picture: userData.picture,
            verified_email: userData.verified_email,
            connectionId: connectionId, // Add connectionId to session
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours in seconds
            iat: Math.floor(Date.now() / 1000), // issued at
        };
        
        // Sign the JWT token with the server's secret
        const sessionToken = await jwt.sign(sessionPayload, env.JWT_SECRET);
        
        console.log('Generated JWT session token successfully');
        console.log('JWT token expiration:', new Date((sessionPayload.exp * 1000)).toISOString());
        
        // Redirect with the JWT session token
        const successUrl = `${config.app.publicUrl}/auth/callback/google?success=true&email=${encodeURIComponent(userData.email)}&name=${encodeURIComponent(userData.name)}&picture=${encodeURIComponent(userData.picture)}&session=${encodeURIComponent(sessionToken)}`;
        
        console.log('Redirecting to frontend with success and JWT session token');
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
            } else if (error.message.includes('jwt')) {
                errorType = 'jwt_error';
            }
        }
        return c.redirect(`${config.app.publicUrl}/auth/callback/google?error=${encodeURIComponent(errorType)}`);
    }
}; 