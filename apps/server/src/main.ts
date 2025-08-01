// Temporarily disabled for startup optimization
// import {
//   createUpdatedMatrixFromNewEmail,
//   initializeStyleMatrixFromNewEmail,
//   type EmailMatrix,
//   type WritingStyleMatrix,
// } from './services/writing-style-service';
import {
  account,
  connection,
  note,
  session,
  user,
  userHotkeys,
  userSettings,

} from './db/schema';
import { env, DurableObject, RpcTarget, WorkerEntrypoint } from 'cloudflare:workers';
import { EProviders, type ISubscribeBatch, type IThreadBatch } from './types';
import { oAuthDiscoveryMetadata } from 'better-auth/plugins';
import { getZeroDB, verifyToken } from './lib/server-utils';
import { eq, and, desc, asc, inArray } from 'drizzle-orm';
// import { ThinkingMCP } from './lib/sequential-thinking';
import { ZeroDriver } from './routes/agent';
// import { ZeroAgent } from './routes/agent';
import { contextStorage } from 'hono/context-storage';
import { defaultUserSettings } from './lib/schemas';
// import { createLocalJWKSet, jwtVerify } from 'jose';
import { getZeroAgent } from './lib/server-utils';
// Temporarily disabled for startup optimization
// import { enableBrainFunction } from './lib/brain';
import { trpcServer } from '@hono/trpc-server';
import { agentsMiddleware } from 'hono-agents';
// import { ZeroMCP } from './routes/agent/mcp';
import { publicRouter } from './routes/auth';
import { WorkflowRunner } from './pipelines';
// import { autumnApi } from './routes/autumn';
import type { HonoContext } from './ctx';
import { createDb, type DB } from './db';
// Lazy imports to reduce startup time
import { createAuth } from './lib/auth';
// import { aiRouter } from './routes/ai';
// import { Autumn } from 'autumn-js';
import { appRouter } from './trpc';
import { cors } from 'hono/cors';
import { Hono } from 'hono';
import { createRouteHandler } from './handlers/route-handler';

const SENTRY_HOST = 'o4509328786915328.ingest.us.sentry.io';
const SENTRY_PROJECT_IDS = new Set(['4509328795303936']);

export class DbRpcDO extends RpcTarget {
  constructor(
    private mainDo: ZeroDB,
    private userId: string,
  ) {
    super();
  }

  async findUser(): Promise<typeof user.$inferSelect | undefined> {
    return await this.mainDo.findUser(this.userId);
  }

  async findUserConnection(
    connectionId: string,
  ): Promise<typeof connection.$inferSelect | undefined> {
    return await this.mainDo.findUserConnection(this.userId, connectionId);
  }

  async updateUser(data: Partial<typeof user.$inferInsert>) {
    return await this.mainDo.updateUser(this.userId, data);
  }

  async deleteConnection(connectionId: string) {
    return await this.mainDo.deleteConnection(connectionId, this.userId);
  }

  async findFirstConnection(): Promise<typeof connection.$inferSelect | undefined> {
    return await this.mainDo.findFirstConnection(this.userId);
  }

  async findManyConnections(): Promise<(typeof connection.$inferSelect)[]> {
    return await this.mainDo.findManyConnections(this.userId);
  }

  async findManyNotesByThreadId(threadId: string): Promise<(typeof note.$inferSelect)[]> {
    return await this.mainDo.findManyNotesByThreadId(this.userId, threadId);
  }

  async createNote(payload: Omit<typeof note.$inferInsert, 'userId'>) {
    return await this.mainDo.createNote(this.userId, payload as typeof note.$inferInsert);
  }

  async updateNote(noteId: string, payload: Partial<typeof note.$inferInsert>) {
    return await this.mainDo.updateNote(this.userId, noteId, payload);
  }

  async updateManyNotes(
    notes: { id: string; order: number; isPinned?: boolean | null }[],
  ): Promise<boolean> {
    return await this.mainDo.updateManyNotes(this.userId, notes);
  }

  async findManyNotesByIds(noteIds: string[]): Promise<(typeof note.$inferSelect)[]> {
    return await this.mainDo.findManyNotesByIds(this.userId, noteIds);
  }

  async deleteNote(noteId: string) {
    return await this.mainDo.deleteNote(this.userId, noteId);
  }

  async findNoteById(noteId: string): Promise<typeof note.$inferSelect | undefined> {
    return await this.mainDo.findNoteById(this.userId, noteId);
  }

  async findHighestNoteOrder(): Promise<{ order: number } | undefined> {
    return await this.mainDo.findHighestNoteOrder(this.userId);
  }

  async deleteUser() {
    return await this.mainDo.deleteUser(this.userId);
  }

  async findUserSettings(): Promise<typeof userSettings.$inferSelect | undefined> {
    return await this.mainDo.findUserSettings(this.userId);
  }

  async findUserHotkeys(): Promise<(typeof userHotkeys.$inferSelect)[]> {
    return await this.mainDo.findUserHotkeys(this.userId);
  }

  async insertUserHotkeys(shortcuts: (typeof userHotkeys.$inferInsert)[]) {
    return await this.mainDo.insertUserHotkeys(this.userId, shortcuts);
  }

  async insertUserSettings(settings: typeof defaultUserSettings) {
    return await this.mainDo.insertUserSettings(this.userId, settings);
  }

  async updateUserSettings(settings: typeof defaultUserSettings) {
    return await this.mainDo.updateUserSettings(this.userId, settings);
  }

  async createConnection(
    providerId: EProviders,
    email: string,
    updatingInfo: {
      expiresAt: Date;
      scope: string;
    },
  ): Promise<{ id: string }[]> {
    return await this.mainDo.createConnection(providerId, email, this.userId, updatingInfo);
  }

  async findConnectionById(
    connectionId: string,
  ): Promise<typeof connection.$inferSelect | undefined> {
    return await this.mainDo.findConnectionById(connectionId);
  }





  async deleteActiveConnection(connectionId: string) {
    return await this.mainDo.deleteActiveConnection(this.userId, connectionId);
  }

  async updateConnection(
    connectionId: string,
    updatingInfo: Partial<typeof connection.$inferInsert>,
  ) {
    return await this.mainDo.updateConnection(connectionId, updatingInfo);
  }
}

class ZeroDB extends DurableObject<Env> {
  db: DB;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.db = createDb(env.HYPERDRIVE.connectionString).db;
  }

  async setMetaData(userId: string) {
    return new DbRpcDO(this, userId);
  }

  async findUser(userId: string): Promise<typeof user.$inferSelect | undefined> {
    return await this.db.query.user.findFirst({
      where: eq(user.id, userId),
    });
  }

  async findUserConnection(
    userId: string,
    connectionId: string,
  ): Promise<typeof connection.$inferSelect | undefined> {
    return await this.db.query.connection.findFirst({
      where: and(eq(connection.userId, userId), eq(connection.id, connectionId)),
    });
  }

  async updateUser(userId: string, data: Partial<typeof user.$inferInsert>) {
    return await this.db.update(user).set(data).where(eq(user.id, userId));
  }

  async deleteConnection(connectionId: string, userId: string) {
    const connections = await this.findManyConnections(userId);
    if (connections.length <= 1) {
      throw new Error('Cannot delete the last connection. At least one connection is required.');
    }
    return await this.db
      .delete(connection)
      .where(and(eq(connection.id, connectionId), eq(connection.userId, userId)));
  }

  async findFirstConnection(userId: string): Promise<typeof connection.$inferSelect | undefined> {
    return await this.db.query.connection.findFirst({
      where: eq(connection.userId, userId),
    });
  }

  async findManyConnections(userId: string): Promise<(typeof connection.$inferSelect)[]> {
    return await this.db.query.connection.findMany({
      where: eq(connection.userId, userId),
    });
  }

  async findManyNotesByThreadId(
    userId: string,
    threadId: string,
  ): Promise<(typeof note.$inferSelect)[]> {
    return await this.db.query.note.findMany({
      where: and(eq(note.userId, userId), eq(note.threadId, threadId)),
      orderBy: [desc(note.isPinned), asc(note.order), desc(note.createdAt)],
    });
  }

  async createNote(userId: string, payload: typeof note.$inferInsert) {
    return await this.db
      .insert(note)
      .values({
        ...payload,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
  }

  async updateNote(
    userId: string,
    noteId: string,
    payload: Partial<typeof note.$inferInsert>,
  ): Promise<typeof note.$inferSelect | undefined> {
    const [updated] = await this.db
      .update(note)
      .set({
        ...payload,
        updatedAt: new Date(),
      })
      .where(and(eq(note.id, noteId), eq(note.userId, userId)))
      .returning();
    return updated;
  }

  async updateManyNotes(
    userId: string,
    notes: { id: string; order: number; isPinned?: boolean | null }[],
  ): Promise<boolean> {
    return await this.db.transaction(async (tx) => {
      for (const n of notes) {
        const updateData: Record<string, unknown> = {
          order: n.order,
          updatedAt: new Date(),
        };

        if (n.isPinned !== undefined) {
          updateData.isPinned = n.isPinned;
        }
        await tx
          .update(note)
          .set(updateData)
          .where(and(eq(note.id, n.id), eq(note.userId, userId)));
      }
      return true;
    });
  }

  async findManyNotesByIds(
    userId: string,
    noteIds: string[],
  ): Promise<(typeof note.$inferSelect)[]> {
    return await this.db.query.note.findMany({
      where: and(eq(note.userId, userId), inArray(note.id, noteIds)),
    });
  }

  async deleteNote(userId: string, noteId: string) {
    return await this.db.delete(note).where(and(eq(note.id, noteId), eq(note.userId, userId)));
  }

  async findNoteById(
    userId: string,
    noteId: string,
  ): Promise<typeof note.$inferSelect | undefined> {
    return await this.db.query.note.findFirst({
      where: and(eq(note.id, noteId), eq(note.userId, userId)),
    });
  }

  async findHighestNoteOrder(userId: string): Promise<{ order: number } | undefined> {
    return await this.db.query.note.findFirst({
      where: eq(note.userId, userId),
      orderBy: desc(note.order),
      columns: { order: true },
    });
  }

  async deleteUser(userId: string) {
    return await this.db.transaction(async (tx) => {
      await tx.delete(connection).where(eq(connection.userId, userId));
      await tx.delete(account).where(eq(account.userId, userId));
      await tx.delete(session).where(eq(session.userId, userId));
      await tx.delete(userSettings).where(eq(userSettings.userId, userId));
      await tx.delete(user).where(eq(user.id, userId));
      await tx.delete(userHotkeys).where(eq(userHotkeys.userId, userId));
    });
  }

  async findUserSettings(userId: string): Promise<typeof userSettings.$inferSelect | undefined> {
    return await this.db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });
  }

  async findUserHotkeys(userId: string): Promise<(typeof userHotkeys.$inferSelect)[]> {
    return await this.db.query.userHotkeys.findMany({
      where: eq(userHotkeys.userId, userId),
    });
  }

  async insertUserHotkeys(userId: string, shortcuts: (typeof userHotkeys.$inferInsert)[]) {
    return await this.db
      .insert(userHotkeys)
      .values({
        userId,
        shortcuts,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userHotkeys.userId,
        set: {
          shortcuts,
          updatedAt: new Date(),
        },
      });
  }

  async insertUserSettings(userId: string, settings: typeof defaultUserSettings) {
    return await this.db.insert(userSettings).values({
      id: crypto.randomUUID(),
      userId,
      settings,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async updateUserSettings(userId: string, settings: typeof defaultUserSettings) {
    return await this.db
      .insert(userSettings)
      .values({
        id: crypto.randomUUID(),
        userId,
        settings,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: {
          settings,
          updatedAt: new Date(),
        },
      });
  }

  async createConnection(
    providerId: EProviders,
    email: string,
    userId: string,
    updatingInfo: {
      expiresAt: Date;
      scope: string;
    },
  ): Promise<{ id: string }[]> {
    return await this.db
      .insert(connection)
      .values({
        ...updatingInfo,
        providerId,
        id: crypto.randomUUID(),
        email,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [connection.email, connection.userId],
        set: {
          ...updatingInfo,
          updatedAt: new Date(),
        },
      })
      .returning({ id: connection.id });
  }

  /**
   * @param connectionId Dangerous, use findUserConnection instead
   * @returns
   */
  async findConnectionById(
    connectionId: string,
  ): Promise<typeof connection.$inferSelect | undefined> {
    return await this.db.query.connection.findFirst({
      where: eq(connection.id, connectionId),
    });
  }



  async deleteActiveConnection(userId: string, connectionId: string) {
    return await this.db
      .delete(connection)
      .where(and(eq(connection.userId, userId), eq(connection.id, connectionId)));
  }

  async updateConnection(
    connectionId: string,
    updatingInfo: Partial<typeof connection.$inferInsert>,
  ) {
    return await this.db
      .update(connection)
      .set(updatingInfo)
      .where(eq(connection.id, connectionId));
  }
}

const api = new Hono<HonoContext>()
  .use(contextStorage())
  .use('*', async (c, next) => {
    const auth = createAuth();
    c.set('auth', auth);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    c.set('sessionUser', session?.user);

    if (c.req.header('Authorization') && !session?.user) {
      const token = c.req.header('Authorization')?.split(' ')[1];

      // if (token) {
      //   const localJwks = await auth.api.getJwks();
      //   const jwks = createLocalJWKSet(localJwks);

      //   const { payload } = await jwtVerify(token, jwks);
      //   const userId = payload.sub;

      //   if (userId) {
      //     const db = await getZeroDB(userId);
      //     c.set('sessionUser', await db.findUser());
      //   }
      // }
    }

    // const autumn = new Autumn({ secretKey: env.AUTUMN_SECRET_KEY });
    // c.set('autumn', autumn);

    await next();

    c.set('sessionUser', undefined);
    // c.set('autumn', undefined as any);
    c.set('auth', undefined as any);
  })
  // .route('/ai', aiRouter)
  // .route('/autumn', autumnApi)
  .route('/public', publicRouter)
  .on(['GET', 'POST', 'OPTIONS'], '/auth/*', (c) => {
    return c.var.auth.handler(c.req.raw);
  })
  .use(
    trpcServer({
      endpoint: '/api/trpc',
      router: appRouter,
      createContext: (_, c) => {
        return { c, sessionUser: c.var['sessionUser'] };
      },
      allowMethodOverride: true,
      onError: (opts) => {
        console.error('Error in TRPC handler:', opts.error);
      },
    }),
  )
  .onError(async (err, c) => {
    if (err instanceof Response) return err;
    console.error('Error in Hono handler:', err);
    return c.json(
      {
        error: 'Internal Server Error',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      500,
    );
  });

let app: Hono<HonoContext> | null = null;

function getApp() {
  if (!app) {
    app = new Hono<HonoContext>()
      .use(
        '*',
        cors({
          origin: (origin) => {
            if (!origin) return null;
            let hostname: string;
            try {
              hostname = new URL(origin).hostname;
            } catch {
              return null;
            }
            const cookieDomain = env.COOKIE_DOMAIN;
            if (!cookieDomain) return null;
            if (hostname === cookieDomain || hostname.endsWith('.' + cookieDomain)) {
              return origin;
            }
            return null;
          },
          credentials: true,
          allowHeaders: ['Content-Type', 'Authorization'],
          exposeHeaders: ['X-Zero-Redirect'],
        }),
      )
  .get('.well-known/oauth-authorization-server', async (c) => {
    const auth = createAuth();
    return oAuthDiscoveryMetadata(auth)(c.req.raw);
  })
  // .mount(
  //   '/sse',
  //   async (request, env, ctx) => {
  //     const authBearer = request.headers.get('Authorization');
  //     if (!authBearer) {
  //       console.log('No auth provided');
  //       return new Response('Unauthorized', { status: 401 });
  //     }
  //     const auth = createAuth();
  //     const session = await auth.api.getMcpSession({ headers: request.headers });
  //     if (!session) {
  //       console.log('Invalid auth provided', Array.from(request.headers.entries()));
  //       return new Response('Unauthorized', { status: 401 });
  //     }
  //     ctx.props = {
  //       userId: session?.userId,
  //     };
  //     return ZeroMCP.serveSSE('/sse', { binding: 'ZERO_MCP' }).fetch(request, env, ctx);
  //   },
  //   { replaceRequest: false },
  // )
  // .mount(
  //   '/mcp/thinking/sse',
  //   async (request, env, ctx) => {
  //     return ThinkingMCP.serveSSE('/mcp/thinking/sse', { binding: 'THINKING_MCP' }).fetch(
  //       request,
  //       env,
  //       ctx,
  //     );
  //   },
  //   { replaceRequest: false },
  // )
  // .mount(
  //   '/mcp',
  //   async (request, env, ctx) => {
  //     const authBearer = request.headers.get('Authorization');
  //     if (!authBearer) {
  //       return new Response('Unauthorized', { status: 401 });
  //     }
  //     const auth = createAuth();
  //     const session = await auth.api.getMcpSession({ headers: request.headers });
  //     if (!session) {
  //       console.log('Invalid auth provided', Array.from(request.headers.entries()));
  //       return new Response('Unauthorized', { status: 401 });
  //     }
  //     ctx.props = {
  //       userId: session?.userId,
  //     };
  //     return ZeroMCP.serve('/mcp', { binding: 'ZERO_MCP' }).fetch(request, env, ctx);
  //   },
  //   { replaceRequest: false },
  // )
  .route('/api', api)
  .use(
    '*',
    agentsMiddleware({
      options: {
        onBeforeConnect: (c) => {
          if (!c.headers.get('Cookie')) {
            return new Response('Unauthorized', { status: 401 });
          }
        },
      },
    }),
  )
  .get('/health', (c) => c.json({ message: 'Zero Server is Up!' }))
  .get('/', (c) => c.redirect(`${env.VITE_PUBLIC_APP_URL}`))
  .post('/monitoring/sentry', async (c) => {
    try {
      const envelopeBytes = await c.req.arrayBuffer();
      const envelope = new TextDecoder().decode(envelopeBytes);
      const piece = envelope.split('\n')[0];
      const header = JSON.parse(piece);
      const dsn = new URL(header['dsn']);
      const project_id = dsn.pathname?.replace('/', '');

      if (dsn.hostname !== SENTRY_HOST) {
        throw new Error(`Invalid sentry hostname: ${dsn.hostname}`);
      }

      if (!project_id || !SENTRY_PROJECT_IDS.has(project_id)) {
        throw new Error(`Invalid sentry project id: ${project_id}`);
      }

      const upstream_sentry_url = `https://${SENTRY_HOST}/api/${project_id}/envelope/`;
      await fetch(upstream_sentry_url, {
        method: 'POST',
        body: envelopeBytes,
      });

      return c.json({}, { status: 200 });
    } catch (e) {
      console.error('error tunneling to sentry', e);
      return c.json({ error: 'error tunneling to sentry' }, { status: 500 });
    }
  })
  // .post('/a8n/notify/:providerId', async (c) => {
  //   // Temporarily disabled for deployment optimization
  //   return c.json({ message: 'OK' }, { status: 200 });
  // });
  }
  return app;
}

export default class Entry extends WorkerEntrypoint<Env> {
  private routeHandler = createRouteHandler();

  async fetch(request: Request): Promise<Response> {
    const allowedOriginEnv = this.env.CORS_ALLOW_ORIGIN || "*";

    // Handle CORS pre-flight requests early
    if (request.method === "OPTIONS") {
      const headers = new Headers();
      const requestOrigin = request.headers.get("Origin") || "";

      // Echo back the exact origin if it is in our allow-list
      if (allowedOriginEnv === "*" || allowedOriginEnv.split(",").includes(requestOrigin)) {
        headers.set("Access-Control-Allow-Origin", requestOrigin);
      }

      headers.set("Access-Control-Allow-Credentials", "true");
      headers.set(
        "Access-Control-Allow-Headers",
        request.headers.get("Access-Control-Request-Headers") || "*",
      );
      headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      return new Response(null, { status: 204, headers });
    }

    // Check if this is a route that needs lazy loading
    const url = new URL(request.url);
    const path = url.pathname;

    // Use lazy loading route handler for heavy dependency routes
    if (this.shouldUseLazyLoading(path)) {
      try {
        const response = await this.routeHandler.handleRequest(request, this.ctx);
        
        // Add CORS headers
        const requestOrigin = request.headers.get("Origin") || "";
        if (allowedOriginEnv === "*" || allowedOriginEnv.split(",").includes(requestOrigin)) {
          response.headers.set("Access-Control-Allow-Origin", requestOrigin);
        }
        response.headers.set("Access-Control-Allow-Credentials", "true");
        response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
        response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
        response.headers.append("Vary", "Origin");

        return response;
      } catch (error) {
        console.error('Error in lazy loading route handler:', error);
        // Fallback to regular app
      }
    }

    // Normal requests – proxy to the app and then add CORS headers
    const app = getApp();
    const response = await app.fetch(request, this.env, this.ctx);
    const requestOrigin = request.headers.get("Origin") || "";
    if (allowedOriginEnv === "*" || allowedOriginEnv.split(",").includes(requestOrigin)) {
      response.headers.set("Access-Control-Allow-Origin", requestOrigin);
    }
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    // Inform caches that the response varies based on Origin header
    response.headers.append("Vary", "Origin");

    return response;
  }

  /**
   * Determine if a route should use lazy loading
   */
  private shouldUseLazyLoading(path: string): boolean {
    return path.startsWith('/api/trpc/mail') ||
           path.startsWith('/api/gmail') ||
           path.startsWith('/api/send-email') ||
           path.startsWith('/api/trpc/ai.compose') ||
           path.includes('/process-html') ||
           path.includes('/sanitize') ||
           path.includes('/email-content');
  }
  async queue(batch: MessageBatch<any>) {
    switch (true) {
      // Queue processing removed for free plan compatibility
      // Direct function calls are used instead
    }
  }
  async scheduled() {
    // Temporarily disabled for deployment optimization
    console.log('[SCHEDULED] Disabled for deployment optimization');
  }
}

export { ZeroDB, WorkflowRunner, ZeroDriver };
// export { ZeroAgent, ZeroMCP, ThinkingMCP }; // Temporarily disabled for deployment
