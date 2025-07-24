import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { contextStorage } from 'hono/context-storage';
import { aiRouter } from './routes/ai';
import { env, WorkerEntrypoint } from 'cloudflare:workers';
import { appRouter } from './trpc';
import { createAuth } from './lib/auth';
import type { HonoContext, HonoVariables } from './ctx';
// import { trpcServer } from '@hono/trpc-server';

// Simple Durable Objects for Google OAuth only
class ZeroAgent {
  constructor() {}
}

class ZeroMCP {
  constructor() {}
}

class ZeroDB {
  constructor() {}
}

class ZeroDriver {
  constructor() {}
}

// Type definitions for Google OAuth responses
interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

export default class extends WorkerEntrypoint<typeof env> {
  private app = new Hono<HonoContext>()
    .use('*', cors({
      origin: (origin) => {
        if (!origin) return null;
        let hostname: string;
        try {
          hostname = new URL(origin).hostname;
        } catch {
          return null;
        }
        // Allow Render domains and localhost for development
        if (hostname === 'pitext-email.onrender.com' || 
            hostname.endsWith('.onrender.com') || 
            hostname === 'localhost' || 
            hostname === '127.0.0.1') {
          return origin;
        }
        return null;
      },
      credentials: true,
      allowHeaders: ['Content-Type', 'Authorization', 'X-Session-Token'],
      exposeHeaders: ['X-Zero-Redirect'],
    }))
    .use(contextStorage())
    .use('*', async (c, next) => {
      // Set up context variables
      c.set('auth', createAuth());
      
      // Get session from cookie or header
      const sessionToken = c.req.header('X-Session-Token') || 
        c.req.header('Cookie')?.split(';')
          .find(cookie => cookie.trim().startsWith('session='))
          ?.split('=')[1];
      
      if (sessionToken) {
        try {
          const sessionData = JSON.parse(atob(sessionToken));
          if (sessionData.exp && Date.now() <= sessionData.exp) {
            c.set('sessionUser', {
              id: sessionData.userId,
              email: sessionData.email,
              name: sessionData.name,
              image: sessionData.picture,
              emailVerified: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        } catch (error) {
          console.error('Session parsing error:', error);
        }
      }
      
      await next();
    })
    .get('/test', (c) => c.json({ message: 'Server is working!' }))
    .route('/ai', aiRouter)
    .get('/api/public/providers', async (c) => {
      // Return available authentication providers
      const googleClientId = env.GOOGLE_CLIENT_ID;
      const googleClientSecret = env.GOOGLE_CLIENT_SECRET;
      
      const allProviders = [
        {
          id: 'google',
          name: 'Google',
          enabled: !!(googleClientId && googleClientSecret),
          required: true,
          envVarInfo: [
            {
              name: 'GOOGLE_CLIENT_ID',
              description: 'Google OAuth Client ID',
              required: true,
              defaultValue: 'your-google-client-id'
            },
            {
              name: 'GOOGLE_CLIENT_SECRET', 
              description: 'Google OAuth Client Secret',
              required: true,
              defaultValue: 'your-google-client-secret'
            }
          ],
          envVarStatus: [
            {
              name: 'GOOGLE_CLIENT_ID',
              set: !!googleClientId,
              source: 'environment',
              defaultValue: 'your-google-client-id'
            },
            {
              name: 'GOOGLE_CLIENT_SECRET',
              set: !!googleClientSecret,
              source: 'environment', 
              defaultValue: 'your-google-client-secret'
            }
          ],
          isCustom: false
        }
      ];
      
      return c.json({
        allProviders
      });
    })
    .post('/monitoring/sentry', async (c) => {
      // Handle Sentry monitoring data
      // For now, just return success to prevent 404 errors
      return c.json({ success: true });
    })
    .get('/auth/sign-in/social/google', async (c) => {
      // Simple Google OAuth redirect
      const clientId = env.GOOGLE_CLIENT_ID;
      const redirectUri = env.GOOGLE_REDIRECT_URI || `${env.VITE_PUBLIC_APP_URL}/auth/callback/google`;
      const scope = 'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline`;
      
      return c.redirect(authUrl);
    })
    .get('/api/auth/sign-in/social/google', async (c) => {
      // Simple Google OAuth redirect
      const clientId = env.GOOGLE_CLIENT_ID;
      const redirectUri = env.GOOGLE_REDIRECT_URI || `${env.VITE_PUBLIC_APP_URL}/auth/callback/google`;
      const scope = 'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline`;
      
      return c.redirect(authUrl);
    })
    .get('/auth/callback/google', async (c) => {
      // Handle Google OAuth callback
      const code = c.req.query('code');
      const error = c.req.query('error');
      
      if (error) {
        return c.redirect(`${env.VITE_PUBLIC_APP_URL}/auth/callback/google?error=${encodeURIComponent(error)}`);
      }
      
      if (!code) {
        return c.redirect(`${env.VITE_PUBLIC_APP_URL}/auth/callback/google?error=no_code`);
      }
      
      try {
        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: env.GOOGLE_REDIRECT_URI || `${env.VITE_PUBLIC_APP_URL}/auth/callback/google`,
          }),
        });
        
        if (!tokenResponse.ok) {
          console.error('Token exchange failed:', await tokenResponse.text());
          return c.redirect(`${env.VITE_PUBLIC_APP_URL}/auth/callback/google?error=token_exchange_failed`);
        }
        
        const tokenData = await tokenResponse.json() as GoogleTokenResponse;
        
        // Get user info
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
          },
        });
        
        if (!userResponse.ok) {
          console.error('User info fetch failed:', await userResponse.text());
          return c.redirect(`${env.VITE_PUBLIC_APP_URL}/auth/callback/google?error=user_info_failed`);
        }
        
        const userData = await userResponse.json() as GoogleUserInfo;
        
        // Create a simple session token (in production, use proper JWT)
        const sessionToken = btoa(JSON.stringify({
          userId: userData.id,
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          exp: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        }));
        
        // Set session cookie and redirect to success
        const redirectUrl = `${env.VITE_PUBLIC_APP_URL}/auth/callback/google?success=true&email=${encodeURIComponent(userData.email)}&session=${encodeURIComponent(sessionToken)}`;
        
        const response = c.redirect(redirectUrl);
        // For cross-domain setup, we need to set the cookie on the frontend domain
        // The session token is passed in the URL and will be set by the frontend
        // No server-side cookie setting here since it won't be accessible to the frontend
        
        return response;
        
      } catch (error) {
        console.error('OAuth callback error:', error);
        return c.redirect(`${env.VITE_PUBLIC_APP_URL}/auth/callback/google?error=callback_error`);
      }
    })
    .post('/api/auth/sign-in/social', async (c) => {
      // Handle social sign-in request
      const body = await c.req.json();
      if (body.provider === 'google') {
        const clientId = env.GOOGLE_CLIENT_ID;
        const redirectUri = env.GOOGLE_REDIRECT_URI || `${env.VITE_PUBLIC_APP_URL}/auth/callback/google`;
        const scope = 'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
        
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline`;
        
        return c.json({ url: authUrl });
      }
      return c.json({ error: 'Unsupported provider' }, 400);
    })
    .get('/api/auth/get-session', async (c) => {
      // Get session from custom header (for cross-domain setup) or cookie
      const sessionToken = c.req.header('X-Session-Token') || 
        c.req.header('Cookie')?.split(';')
          .find(cookie => cookie.trim().startsWith('session='))
          ?.split('=')[1];
      
      console.log('Session check - X-Session-Token header:', c.req.header('X-Session-Token') ? 'found' : 'not found');
      console.log('Session check - Cookie header:', c.req.header('Cookie'));
      console.log('Session check - Extracted session:', sessionToken ? 'found' : 'not found');
      
      if (!sessionToken) {
        return c.json({ user: null });
      }
      
      try {
        const sessionData = JSON.parse(atob(sessionToken));
        console.log('Session check - Parsed session data:', { 
          userId: sessionData.userId, 
          email: sessionData.email,
          exp: sessionData.exp,
          currentTime: Date.now()
        });
        
        // Check if session is expired
        if (sessionData.exp && Date.now() > sessionData.exp) {
          console.log('Session check - Session expired');
          return c.json({ user: null });
        }
        
        console.log('Session check - Valid session found');
        return c.json({ 
          user: {
            id: sessionData.userId,
            email: sessionData.email,
            name: sessionData.name,
            picture: sessionData.picture,
          }
        });
      } catch (error) {
        console.error('Session parsing error:', error);
        return c.json({ user: null });
      }
    })
    .post('/api/auth/exchange-code', async (c) => {
      // Handle OAuth code exchange
      const body = await c.req.json();
      const { code } = body;
      
      if (!code) {
        return c.json({ success: false, error: 'No authorization code provided' }, 400);
      }
      
      try {
        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: env.GOOGLE_REDIRECT_URI || `${env.VITE_PUBLIC_APP_URL}/auth/callback/google`,
          }),
        });
        
        if (!tokenResponse.ok) {
          console.error('Token exchange failed:', await tokenResponse.text());
          return c.json({ success: false, error: 'Token exchange failed' }, 400);
        }
        
        const tokenData = await tokenResponse.json() as GoogleTokenResponse;
        
        // Get user info
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
          },
        });
        
        if (!userResponse.ok) {
          console.error('User info fetch failed:', await userResponse.text());
          return c.json({ success: false, error: 'Failed to get user info' }, 400);
        }
        
        const userData = await userResponse.json() as GoogleUserInfo;
        
        // Create a simple session token (in production, use proper JWT)
        const sessionToken = btoa(JSON.stringify({
          userId: userData.id,
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          exp: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        }));
        
        const response = c.json({ 
          success: true, 
          user: {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            picture: userData.picture,
          },
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
        });
        
        // For cross-domain setup, we need to set the cookie on the frontend domain
        // The session token is returned in the response and will be set by the frontend
        // No server-side cookie setting here since it won't be accessible to the frontend
        
        return response;
        
      } catch (error) {
        console.error('OAuth code exchange error:', error);
        return c.json({ success: false, error: 'Code exchange failed' }, 500);
      }
    })
    .get('/api/public/providers', async (c) => {
      // Return available authentication providers
      return c.json({
        providers: [
          {
            id: 'google',
            name: 'Google',
            type: 'oauth',
            style: {
              backgroundColor: '#4285f4',
              color: '#ffffff',
            },
          },
        ],
      });
    })
    .post('/api/auth/sign-out', async (c) => {
      // Handle sign out by clearing session cookie
      const response = c.json({ success: true });
      response.headers.set('Set-Cookie', 'session=; Path=/; HttpOnly; Max-Age=0');
      return response;
    })
    .get('/api/trpc/test', (c) => c.json({ message: 'tRPC endpoint is working!' }))
    .all('/api/trpc/:path*', async (c) => {
      // Handle tRPC requests
      const path = c.req.param('path');
      
      if (!path) {
        return c.json({ error: 'No tRPC procedure specified' }, 400);
      }
      
      try {
        // Create context for tRPC
        const ctx = {
          c,
          sessionUser: c.var.sessionUser,
          auth: c.var.auth,
        };
        
        // Parse the procedure path (e.g., "mail.listThreads" -> ["mail", "listThreads"])
        const [routerName, procedureName] = path.split('.');
        
        if (!routerName || !procedureName) {
          return c.json({ error: 'Invalid tRPC procedure path' }, 400);
        }
        
        // Create caller and call the procedure
        const caller = appRouter.createCaller(ctx);
        const result = await caller[routerName as keyof typeof caller][procedureName as any]();
        return c.json(result);
        
      } catch (error: any) {
        console.error('tRPC error:', error);
        
        if (error.code === 'UNAUTHORIZED') {
          return c.json({ error: 'Unauthorized' }, 401);
        }
        
        if (error.code === 'BAD_REQUEST') {
          return c.json({ error: error.message || 'Bad request' }, 400);
        }
        
        return c.json({ error: 'Internal server error' }, 500);
      }
    });

  async fetch(request: Request): Promise<Response> {
    return this.app.fetch(request);
  }
}

export { ZeroAgent, ZeroMCP, ZeroDB, ZeroDriver };
