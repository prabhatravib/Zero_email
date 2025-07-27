import { createConfig } from '../../config';
import type { HonoContext } from '../../ctx';
import jwt from '@tsndr/cloudflare-worker-jwt';
import { google } from 'googleapis';
import { env } from 'cloudflare:workers';
import { getConfig } from '../../config.js';

export const googleCallbackHandler = async (c: HonoContext) => {
  const config = getConfig(c.env as any);

  try {
    if (!config.google.clientId || !config.google.clientSecret || !config.google.redirectUri) {
      console.error("Google OAuth configuration is missing required fields.");
      return c.redirect(`${config.app.publicUrl}/auth/google/callback?error=${encodeURIComponent('oauth_config_error')}`);
    }
    
    if (!config.jwt.secret) {
      console.error("JWT secret is not configured.");
      return c.redirect(`${config.app.publicUrl}/auth/google/callback?error=${encodeURIComponent('jwt_config_error')}`);
    }

    const oauth2Client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri,
    );

    const code = c.req.query('code');
    const error = c.req.query('error');

    if (error) {
      console.error('OAuth Error:', error);
      return c.redirect(`${config.app.publicUrl}/auth/google/callback?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      console.error('No authorization code provided.');
      return c.redirect(`${config.app.publicUrl}/auth/google/callback?error=no_code`);
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    if (!tokens.access_token || !tokens.refresh_token) {
      let errorJson;
      try {
        const tokenResponseText = await (await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: config.google.clientId,
            client_secret: config.google.clientSecret,
            redirect_uri: config.google.redirectUri,
            grant_type: 'authorization_code',
          }),
        })).text();
        errorJson = JSON.parse(tokenResponseText);
      } catch (e) {
        // ignore if parsing fails
      }

      if (errorJson && errorJson.error) {
        console.error('Token exchange error:', errorJson);
        return c.redirect(`${config.app.publicUrl}/auth/google/callback?error=${encodeURIComponent(errorJson.error)}&error_description=${encodeURIComponent(errorJson.error_description || '')}`);
      }

      console.error('Token exchange failed without a specific error message.');
      return c.redirect(`${config.app.publicUrl}/auth/google/callback?error=token_exchange_failed`);
    }

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2',
    });

    const userInfoResponse = await oauth2.userinfo.get();
    const userData = userInfoResponse.data;

    if (!userData || !userData.email || !userData.id) {
      console.error('Failed to retrieve valid user info from Google.');
      return c.redirect(`${config.app.publicUrl}/auth/google/callback?error=user_info_failed`);
    }

    const sessionPayload = {
      userId: userData.id,
      email: userData.email,
      name: userData.name,
      picture: userData.picture,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      scope: tokens.scope,
      expiresAt: Date.now() + (tokens.expiry_date || 3600) * 1000,
    };
    
    let session;
    let errorType = '';
    
    try {
      const jwtPayload = {
        userId: sessionPayload.userId,
        email: sessionPayload.email,
        name: sessionPayload.name,
        picture: sessionPayload.picture,
        access_token: sessionPayload.accessToken,
        refresh_token: sessionPayload.refreshToken,
        scope: sessionPayload.scope,
        expiresAt: sessionPayload.expiresAt,
        iat: Math.floor(Date.now() / 1000),
      };

      const signedJwt = await jwt.sign(jwtPayload, config.jwt.secret);
      
      const sessionData = {
        ...sessionPayload,
        jwt: signedJwt,
      };

      const serializedSession = JSON.stringify(sessionData);
      session = btoa(serializedSession);
    } catch (e) {
      if (e instanceof Error && e.message.includes('Key must be type')) {
        errorType = 'jwt_secret_invalid';
      } else {
        errorType = 'jwt_signing_error';
      }
      console.error(`JWT Signing Error (${errorType}):`, e);
    }

    if (errorType || !session) {
      return c.redirect(`${config.app.publicUrl}/auth/google/callback?error=${encodeURIComponent(errorType)}`);
    }

    const successUrl = `${config.app.publicUrl}/auth/google/callback?success=true&email=${encodeURIComponent(userData.email)}&name=${encodeURIComponent(userData.name || '')}&picture=${encodeURIComponent(userData.picture || '')}&session=${encodeURIComponent(session)}`;
    
    return c.redirect(successUrl);

  } catch (err: unknown) {
    const error = err as Error & { code?: string; errors?: any[] };
    let errorType = 'unknown_error';
    if (error.code === 'ENOTFOUND') {
      errorType = 'dns_error';
    } else if (error.message.includes('invalid_grant')) {
      errorType = 'invalid_grant';
    }
    console.error(`Google Callback Handler Error (${errorType}):`, error);
    return c.redirect(`${config.app.publicUrl}/auth/google/callback?error=${encodeURIComponent(errorType)}`);
  }
}; 