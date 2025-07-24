import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { contextStorage } from 'hono/context-storage';
import { aiRouter } from './routes/ai';
import { autumnApi } from './routes/autumn';
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
    .route('/api/autumn', autumnApi)
    .get('/auth/sign-in/social/google', async (c) => {
      // Simple Google OAuth redirect
      const clientId = env.GOOGLE_CLIENT_ID;
      const redirectUri = `${env.VITE_PUBLIC_BACKEND_URL}/auth/callback/google`;
      const scope = 'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline`;
      
      return c.redirect(authUrl);
    })
    .get('/api/auth/sign-in/social/google', async (c) => {
      // Simple Google OAuth redirect
      const clientId = env.GOOGLE_CLIENT_ID;
      const redirectUri = `${env.VITE_PUBLIC_BACKEND_URL}/auth/callback/google`;
      const scope = 'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline`;
      
      return c.redirect(authUrl);
    })
    .post('/api/auth/sign-in/social', async (c) => {
      // Handle social sign-in request
      const body = await c.req.json();
      if (body.provider === 'google') {
        const clientId = env.GOOGLE_CLIENT_ID;
        const redirectUri = `${env.VITE_PUBLIC_BACKEND_URL}/auth/callback/google`;
        const scope = 'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
        
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline`;
        
        return c.json({ url: authUrl });
      }
      return c.json({ error: 'Unsupported provider' }, 400);
    })
    .get('/api/auth/get-session', async (c) => {
      // Simple session check - return null for now
      return c.json({ user: null });
    });

  async fetch(request: Request): Promise<Response> {
    return this.app.fetch(request);
  }
}

export { ZeroAgent, ZeroMCP, ZeroDB, ZeroDriver };
