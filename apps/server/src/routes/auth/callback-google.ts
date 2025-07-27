import type { HonoContext } from '../../ctx';
import jwt from '@tsndr/cloudflare-worker-jwt';
import { getConfig } from '../../config.js';

export const googleCallbackHandler = async (c: HonoContext) => {
  const config = getConfig(c.env as any);
  const code = c.req.query('code');
  const errorQuery = c.req.query('error');

  if (errorQuery) {
    console.error('OAuth Error from Google:', errorQuery);
    return c.redirect(`${config.app.publicUrl}/auth/google/callback?error=${encodeURIComponent(errorQuery)}`);
  }

  if (!code) {
    console.error('No authorization code provided.');
    return c.redirect(`${config.app.publicUrl}/auth/google/callback?error=no_code`);
  }

  try {
    // 1. Exchange authorization code for tokens
    const tokenParams = new URLSearchParams({
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      redirect_uri: config.google.redirectUri,
      grant_type: 'authorization_code',
      code,
    });

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', { status: tokenResponse.status, body: errorText });
      return c.redirect(`${config.app.publicUrl}/auth/google/callback?error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json() as { access_token: string; refresh_token: string; expiry_date: number; scope: string };

    // 2. Use access token to get user info
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoResponse.ok) {
      console.error('Failed to fetch user info:', { status: userInfoResponse.status });
      return c.redirect(`${config.app.publicUrl}/auth/google/callback?error=user_info_failed`);
    }

    const userData = await userInfoResponse.json() as { id: string; email: string; name?: string; picture?: string; };

    if (!userData || !userData.email || !userData.id) {
        console.error('Invalid user data received from Google.');
        return c.redirect(`${config.app.publicUrl}/auth/google/callback?error=invalid_user_data`);
    }

    // 3. Create a session JWT for our application
    const sessionPayload = {
      userId: userData.id,
      email: userData.email,
      name: userData.name,
      picture: userData.picture,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      scope: tokens.scope,
      expiresAt: Date.now() + (tokens.expiry_date || 3600) * 1000,
      iat: Math.floor(Date.now() / 1000),
    };

    const sessionToken = await jwt.sign(sessionPayload, config.jwt.secret);

    // 4. Redirect back to the frontend with the session token
    const successUrlParams = new URLSearchParams({
      success: 'true',
      email: userData.email,
      name: userData.name || '',
      picture: userData.picture || '',
      session: sessionToken,
    });

    const successUrl = `${config.app.publicUrl}/auth/google/callback?${successUrlParams.toString()}`;
    
    return c.redirect(successUrl);

  } catch (err) {
    console.error('Google Callback Handler unexpected error:', err);
    return c.redirect(`${config.app.publicUrl}/auth/google/callback?error=unknown_error`);
  }
}; 