import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { contextStorage } from 'hono/context-storage';
import { aiRouter } from './routes/ai';
import { env, WorkerEntrypoint } from 'cloudflare:workers';

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
  private app = new Hono()
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
      allowHeaders: ['Content-Type', 'Authorization'],
      exposeHeaders: ['X-Zero-Redirect'],
    }))
    .use(contextStorage())
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
      const redirectUri = `${env.VITE_PUBLIC_APP_URL}/auth/callback/google`;
      const scope = 'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline`;
      
      return c.redirect(authUrl);
    })
    .get('/api/auth/sign-in/social/google', async (c) => {
      // Simple Google OAuth redirect
      const clientId = env.GOOGLE_CLIENT_ID;
      const redirectUri = `${env.VITE_PUBLIC_APP_URL}/auth/callback/google`;
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
            redirect_uri: `${env.VITE_PUBLIC_APP_URL}/auth/callback/google`,
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
        
        // For now, just redirect to the auth callback with success
        // In a real implementation, you'd create a session here
        return c.redirect(`${env.VITE_PUBLIC_APP_URL}/auth/callback/google?success=true&email=${encodeURIComponent(userData.email)}`);
        
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
        const redirectUri = `${env.VITE_PUBLIC_APP_URL}/auth/callback/google`;
        const scope = 'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
        
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline`;
        
        return c.json({ url: authUrl });
      }
      return c.json({ error: 'Unsupported provider' }, 400);
    })
    .get('/api/auth/get-session', async (c) => {
      // Simple session check - return null for now
      return c.json({ user: null });
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
            redirect_uri: `${env.VITE_PUBLIC_APP_URL}/auth/callback/google`,
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
        
        // For now, just return success with user data
        // In a real implementation, you'd create a session here
        return c.json({ 
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
    });

  async fetch(request: Request): Promise<Response> {
    return this.app.fetch(request);
  }
}

export { ZeroAgent, ZeroMCP, ZeroDB, ZeroDriver };
