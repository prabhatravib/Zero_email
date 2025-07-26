import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors';
import { contextStorageMiddleware } from './middleware/context-storage';
import { registerAuthRoutes } from './routes/auth';
import { registerRoutes } from './routes';
import { ZeroAgent, ZeroMCP, ZeroDB, ZeroDriver } from './durable-objects';
import type { HonoContext } from './ctx';

class WorkerClass {
    private app = new Hono<HonoContext>()
        .use('*', corsMiddleware)
        .use(contextStorageMiddleware);

    constructor() {
        // Register all routes
        registerAuthRoutes(this.app);
        registerRoutes(this.app);
    }

    async fetch(request: Request, env: any, ctx: any): Promise<Response> {
        return this.app.fetch(request, env, ctx);
    }
}

// Export Durable Objects
export { ZeroAgent, ZeroMCP, ZeroDB, ZeroDriver };

// Create and export the default worker instance
const worker = new WorkerClass();
export default worker;
