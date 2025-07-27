import { Hono } from 'hono';
import { googleAuth } from '@hono/oauth-providers/google';
import jwt from '@tsndr/cloudflare-worker-jwt';
import { setCookie } from 'hono/cookie';
import type { HonoContext } from '../../ctx';

// Types for Google OAuth response
interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token: string;
  scope: string;
  expires_in: number;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  picture: string;
}

// Unified Google OAuth handler that includes Gmail scopes
export const registerGoogleAuthRoutes = (app: Hono<HonoContext>) => {
  // Google OAuth login endpoint
  app.get('/auth/google/login', async (c: any) => {
    const env = c.env as any;
    const publicUrl = env.VITE_PUBLIC_APP_URL || 'https://pitext-email.onrender.com';
    
    // Generate PKCE code verifier and challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    
    // Build OAuth URL with Gmail scopes
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', `${env.VITE_PUBLIC_BACKEND_URL || 'https://pitext-mail.prabhatravib.workers.dev'}/auth/google/callback`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.readonly'
    ].join(' '));
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    
    // Store code verifier in a temporary cookie for later use
    setCookie(c, 'pkce_verifier', codeVerifier, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      path: '/',
      maxAge: 300, // 5 minutes expiry
    });
    
    return c.redirect(authUrl.toString(), 302);
  });

  // Google OAuth callback endpoint
  app.get('/auth/google/callback', async (c: any) => {
    const env = c.env as any;
    const publicUrl = env.VITE_PUBLIC_APP_URL || 'https://pitext-email.onrender.com';
    
    try {
      const code = c.req.query('code');
      const error = c.req.query('error');
      
      if (error) {
        console.error('Google OAuth error:', error);
        return c.redirect(`${publicUrl}/auth/google/callback?error=${error}`);
      }
      
      if (!code) {
        console.error('No authorization code received');
        return c.redirect(`${publicUrl}/auth/google/callback?error=no_code`);
      }
      
      // Get the code verifier from the temporary cookie
      const pkceCookie = c.req.header('Cookie')?.match(/pkce_verifier=([^;]+)/)?.[1];
      
      if (!pkceCookie) {
        console.error('No PKCE verifier found in cookie');
        return c.redirect(`${publicUrl}/auth/google/callback?error=no_code_verifier`);
      }
      
      const codeVerifier = pkceCookie;
      
      if (!codeVerifier) {
        console.error('No code verifier found in session');
        return c.redirect(`${publicUrl}/auth/google/callback?error=no_code_verifier`);
      }
      
      // Exchange code for tokens
      const tokenResponse = await exchangeCodeForTokens(code, codeVerifier, env);
      
      if (!tokenResponse) {
        console.error('Failed to exchange code for tokens');
        return c.redirect(`${publicUrl}/auth/google/callback?error=token_exchange_failed`);
      }
      
      // Get user info from ID token
      const userInfo = jwt.decode(tokenResponse.id_token) as { payload: GoogleUserInfo };
      
      if (!userInfo || !userInfo.payload) {
        console.error('Failed to decode ID token');
        return c.redirect(`${publicUrl}/auth/google/callback?error=invalid_id_token`);
      }
      
      const user = userInfo.payload;
      
      // Create session with all necessary data
      const sessionPayload = {
        userId: user.sub,
        email: user.email,
        name: user.name,
        picture: user.picture,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        scope: tokenResponse.scope,
        expiresAt: Date.now() + (tokenResponse.expires_in || 3600) * 1000,
        iat: Math.floor(Date.now() / 1000),
      };
      
      const sessionToken = await jwt.sign(sessionPayload, env.JWT_SECRET);
      
      // Store refresh token securely (in production, use a secure storage)
      if (tokenResponse.refresh_token) {
        await storeRefreshToken(user.sub, tokenResponse.refresh_token, env);
      }
      
      // Use Hono's setCookie helper for proper cookie formatting
      setCookie(c, 'session', sessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        path: '/',
        maxAge: tokenResponse.expires_in || 3600,
      });

      // Clear the PKCE verifier cookie
      setCookie(c, 'pkce_verifier', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        path: '/',
        maxAge: 0,
      });

      return c.redirect(`${publicUrl}/mail/inbox`, 302);
      
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      
      // Clear the PKCE verifier cookie on error
      setCookie(c, 'pkce_verifier', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        path: '/',
        maxAge: 0,
      });
      
      return c.redirect(`${publicUrl}/auth/google/callback?error=callback_failed`, 302);
    }
  });
};

// Helper functions
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(digest));
}

function base64URLEncode(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function exchangeCodeForTokens(code: string, codeVerifier: string, env: any): Promise<GoogleTokenResponse | null> {
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const redirectUri = `${env.VITE_PUBLIC_BACKEND_URL || 'https://pitext-mail.prabhatravib.workers.dev'}/auth/google/callback`;
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });
  
  if (!response.ok) {
    console.error('Token exchange failed:', await response.text());
    return null;
  }
  
  return await response.json() as GoogleTokenResponse;
}

async function storeRefreshToken(userId: string, refreshToken: string, env: any) {
  // In production, store this in a secure database or KV store
  // For now, we'll store it in memory (not recommended for production)
  console.log(`Storing refresh token for user: ${userId}`);
  
  // TODO: Implement secure storage for refresh tokens
  // This could be stored in Cloudflare KV, D1 database, or another secure storage
} 