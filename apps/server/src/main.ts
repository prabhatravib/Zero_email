import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { contextStorage } from 'hono/context-storage';
import { aiRouter } from './routes/ai';
import { env, WorkerEntrypoint } from 'cloudflare:workers';
import { trpcServer } from '@hono/trpc-server';
import { appRouter } from './trpc';
import { createAuth } from './lib/auth';
import type { HonoContext } from './ctx';
import { ZeroAgent, ZeroDriver } from './routes/agent';
import { ZeroMCP } from './routes/agent/mcp';
import { eq } from 'drizzle-orm';

// Placeholder for ZeroDB until it's implemented
class ZeroDB {
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
      // Initialize auth for each request
      const auth = createAuth();
      c.set('auth', auth);
      
      // Try to get session user
      try {
        const session = await auth.api.getSession({ headers: c.req.raw.headers });
        if (session?.user) {
          c.set('sessionUser', session.user);
        }
      } catch (error) {
        console.log('Session error:', error);
        // Continue without session
      }
      
      await next();
    })
    .get('/test', (c) => c.json({ message: 'Server is working!' }))
    .route('/ai', aiRouter)
    .post('/api/trpc/*', async (c) => {
      try {
        const path = c.req.path.replace('/api/trpc/', '');
        const body = await c.req.json();
        
        // Get session from cookies or headers
        const sessionToken = c.req.header('Cookie')?.split(';')
          .find(cookie => cookie.trim().startsWith('session='))
          ?.split('=')[1];
        
        let accessToken = null;
        let userEmail = null;
        
        if (sessionToken) {
          try {
            const sessionData = JSON.parse(atob(sessionToken));
            accessToken = sessionData.access_token;
            userEmail = sessionData.email;
          } catch (e) {
            console.log('Failed to parse session token');
          }
        }
        
        // Manual tRPC handler with real Gmail API calls
        if (path === 'categories.defaults') {
          return c.json({ result: { data: [] } });
        }
        
        if (path === 'test.hello') {
          return c.json({ result: { data: { message: 'Hello from tRPC!' } } });
        }
        
        if (path === 'mail.listThreads') {
          if (!accessToken) {
            return c.json({ error: 'No access token found' }, 401);
          }
          
          try {
            const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=50', {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            });
            
            if (!response.ok) {
              throw new Error(`Gmail API error: ${response.status}`);
            }
            
            const data = await response.json();
            return c.json({ result: { data } });
          } catch (error) {
            console.error('Gmail API error:', error);
            return c.json({ error: 'Failed to fetch emails' }, 500);
          }
        }
        
        if (path === 'mail.count') {
          if (!accessToken) {
            return c.json({ error: 'No access token found' }, 401);
          }
          
          try {
            const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            });
            
            if (!response.ok) {
              throw new Error(`Gmail API error: ${response.status}`);
            }
            
            const labels = await response.json() as { labels: Array<{ id: string; threadsTotal?: number }> };
            const counts = labels.labels
              .filter((label) => ['INBOX', 'SENT', 'DRAFT', 'SPAM', 'TRASH'].includes(label.id))
              .map((label) => ({
                count: label.threadsTotal || 0,
                label: label.id,
              }));
            
            return c.json({ result: { data: counts } });
          } catch (error) {
            console.error('Gmail API error:', error);
            return c.json({ error: 'Failed to fetch counts' }, 500);
          }
        }
        
        if (path === 'labels.list') {
          if (!accessToken) {
            return c.json({ error: 'No access token found' }, 401);
          }
          
          try {
            const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            });
            
            if (!response.ok) {
              throw new Error(`Gmail API error: ${response.status}`);
            }
            
            const data = await response.json() as { labels: Array<{ id: string; name: string; type: string }> };
            return c.json({ result: { data: data.labels } });
          } catch (error) {
            console.error('Gmail API error:', error);
            return c.json({ error: 'Failed to fetch labels' }, 500);
          }
        }
        
        if (path === 'connections.getDefault') {
          if (!userEmail) {
            return c.json({ error: 'No user email found' }, 401);
          }
          
          return c.json({ 
            result: { 
              data: {
                id: 'gmail-connection',
                email: userEmail,
                name: userEmail.split('@')[0],
                picture: '',
                createdAt: new Date().toISOString(),
                providerId: 'google',
              } 
            } 
          });
        }
        
        if (path === 'user.getIntercomToken') {
          return c.json({ result: { data: 'mock-intercom-token' } });
        }
        
        if (path === 'settings.get') {
          return c.json({ 
            result: { 
              data: { 
                settings: {
                  language: 'en',
                  timezone: 'UTC',
                  externalImages: false,
                  customPrompt: '',
                  colorTheme: 'system',
                  zeroSignature: true,
                  imageCompression: 'medium',
                  autoRead: true,
                } 
              } 
            } 
          });
        }
        
        // Default response for unknown routes
        return c.json({ result: { data: null } });
      } catch (error) {
        console.error('tRPC error:', error);
        return c.json({ error: 'tRPC error' }, 500);
      }
    })
    .get('/api/auth/get-session', async (c) => {
      try {
        const auth = c.var.auth;
        const session = await auth.api.getSession({ headers: c.req.raw.headers });
        
        if (session?.user) {
          return c.json({
            success: true,
            user: session.user,
            session: session.session,
          });
        } else {
          return c.json({ success: false, user: null });
        }
      } catch (error) {
        console.error('Session error:', error);
        return c.json({ success: false, error: 'Session error' }, 500);
      }
    })
    .get('/api/auth/callback/google', async (c) => {
      const { searchParams } = new URL(c.req.url);
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      
      if (error) {
        console.error('OAuth error:', error);
        return c.json({ success: false, error }, 400);
      }
      
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
        
        // Store user data and OAuth tokens in database
        try {
          const { createDb } = await import('./db');
          const { db, conn } = createDb(env.HYPERDRIVE.connectionString);
          
          // Check if user exists
          const existingUser = await db.query.user.findFirst({
            where: (users, { eq }) => eq(users.id, userData.id),
          });
          
          if (!existingUser) {
            // Create new user
            await db.insert(await import('./db/schema')).user({
              id: userData.id,
              email: userData.email,
              name: userData.name,
              picture: userData.picture,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
          
          // Create or update connection
          const connectionId = `google-${userData.id}`;
          const existingConnection = await db.query.connection.findFirst({
            where: (connections, { eq }) => eq(connections.id, connectionId),
          });
          
          if (existingConnection) {
            // Update existing connection
            await db.update(await import('./db/schema')).connection({
              accessToken: tokenData.access_token,
              refreshToken: tokenData.refresh_token,
              updatedAt: new Date(),
            }).where(eq(connections.id, connectionId));
          } else {
            // Create new connection
            await db.insert(await import('./db/schema')).connection({
              id: connectionId,
              userId: userData.id,
              providerId: 'google',
              email: userData.email,
              name: userData.name,
              picture: userData.picture,
              accessToken: tokenData.access_token,
              refreshToken: tokenData.refresh_token,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
          
          await conn.end();
        } catch (dbError) {
          console.error('Database error:', dbError);
          // Continue without database storage for now
        }
        
        // Create a session token with user data
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
    });

  async fetch(request: Request): Promise<Response> {
    return this.app.fetch(request);
  }
}

export { ZeroAgent, ZeroMCP, ZeroDB, ZeroDriver };
