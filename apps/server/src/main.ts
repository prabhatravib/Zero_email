import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors';
import { contextStorageMiddleware } from './middleware/context-storage';
import { registerAuthRoutes } from './routes/auth/index';
import { registerRoutes } from './routes';
import { ZeroAgent, ZeroMCP, ZeroDB, ZeroDriver } from './durable-objects';
import type { HonoContext } from './ctx';

class WorkerClass {
    private app: Hono<HonoContext>;

    constructor() {
        this.app = new Hono<HonoContext>()
            .use('*', corsMiddleware)
            .use(contextStorageMiddleware);
    }

    async fetch(request: Request, env: any, ctx: any): Promise<Response> {
        // Register all routes
        registerAuthRoutes(this.app);
        registerRoutes(this.app);

        return this.app.fetch(request, env, ctx);
    }
}

// Export Durable Objects
export { ZeroAgent, ZeroMCP, ZeroDB, ZeroDriver };

// Create and export the default worker instance
const worker = new WorkerClass();
export default worker;
