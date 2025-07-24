import { Hono } from 'hono';
import { contextStorage } from 'hono/context-storage';
import { createAuth } from './lib/auth';
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
    .use(contextStorage())
    .use('*', async (c, next) => {
      // Create auth lazily only when needed
      let auth: any = null;
      let session: any = null;
      
      // Only create auth if we need session or auth endpoints
      if (c.req.path.startsWith('/auth') || c.req.path.startsWith('/api/auth') || (c.req.header('Cookie') && !c.req.path.startsWith('/public')) || c.req.header('Authorization')) {
        auth = createAuth();
        c.set('auth', auth);
        session = await auth.api.getSession({ headers: c.req.raw.headers });
        c.set('sessionUser', session?.user);
      }

      await next();

      c.set('auth', undefined as any);
    })
    .get('/test', (c) => c.json({ message: 'Server is working!' }))
    .route('/ai', aiRouter)
    .route('/api/autumn', autumnApi)
    .on(['GET', 'POST', 'OPTIONS'], '/auth/*', async (c) => {
      try {
        console.log(`[AUTH] Handling request to: ${c.req.path}`);
        if (!c.var.auth) {
          console.error('[AUTH] Auth not initialized for path:', c.req.path);
          return c.json(
            {
              error: 'Authentication Error',
              message: 'Auth service not properly initialized',
              path: c.req.path,
            },
            500,
          );
        }
        const response = await c.var.auth.handler(c.req.raw);
        console.log(`[AUTH] Response status: ${response.status}`);
        return response;
      } catch (error) {
        console.error('[AUTH] Error in auth handler:', error);
        return c.json(
          {
            error: 'Authentication Error',
            message: error instanceof Error ? error.message : 'Unknown authentication error',
            path: c.req.path,
          },
          500,
        );
      }
    })
    .on(['GET', 'POST', 'OPTIONS'], '/api/auth/*', async (c) => {
      try {
        console.log(`[AUTH] Handling API request to: ${c.req.path}`);
        if (!c.var.auth) {
          console.error('[AUTH] Auth not initialized for API path:', c.req.path);
          return c.json(
            {
              error: 'Authentication Error',
              message: 'Auth service not properly initialized',
              path: c.req.path,
            },
            500,
          );
        }
        const response = await c.var.auth.handler(c.req.raw);
        console.log(`[AUTH] API Response status: ${response.status}`);
        return response;
      } catch (error) {
        console.error('[AUTH] Error in API auth handler:', error);
        return c.json(
          {
            error: 'Authentication Error',
            message: error instanceof Error ? error.message : 'Unknown authentication error',
            path: c.req.path,
          },
          500,
        );
      }
    });

  async fetch(request: Request): Promise<Response> {
    return this.app.fetch(request);
  }
}

export { ZeroAgent, ZeroMCP, ZeroDB, ZeroDriver };
