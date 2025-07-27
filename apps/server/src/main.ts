import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors';
import { contextStorageMiddleware } from './middleware/context-storage';
import { ZeroAgent, ZeroMCP, ZeroDB, ZeroDriver } from './durable-objects';
import type { HonoContext } from './ctx';

class WorkerClass {
    private app: Hono<HonoContext> | null = null;
    private routesInitialized = false;

    constructor() {
        // Don't initialize anything during startup
    }

    private async initializeRoutes(): Promise<void> {
        if (this.routesInitialized) return;
        
        try {
            // Lazy load route registration to avoid startup overhead
            const { registerAuthRoutes } = await import('./routes/auth/index');
            const { registerRoutes } = await import('./routes');
            
            // Register routes lazily
            registerAuthRoutes(this.app!);
            await registerRoutes(this.app!);
            
            this.routesInitialized = true;
        } catch (error) {
            console.error('Failed to initialize routes:', error);
        }
    }

    private async getApp(): Promise<Hono<HonoContext>> {
        if (!this.app) {
            this.app = new Hono<HonoContext>()
                .use('*', corsMiddleware)
                .use(contextStorageMiddleware);
        }
        
        // Initialize routes on first request
        if (!this.routesInitialized) {
            await this.initializeRoutes();
        }
        
        return this.app;
    }

    async fetch(request: Request, env: any, ctx: any): Promise<Response> {
        const app = await this.getApp();
        return app.fetch(request, env, ctx);
    }
}

// Export Durable Objects
export { ZeroAgent, ZeroMCP, ZeroDB, ZeroDriver };

// Create and export the default worker instance
const worker = new WorkerClass();
export default worker;
