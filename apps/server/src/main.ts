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
                .use(contextStorageMiddleware)
                // Add global error handler to return JSON instead of HTML
                .onError((err, c) => {
                    console.error('Global error handler caught:', err);
                    
                    // Return JSON error response instead of HTML
                    return c.json({
                        error: {
                            code: 'INTERNAL_SERVER_ERROR',
                            message: err.message || 'Internal server error',
                            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
                        }
                    }, 500);
                });
        }
        
        // Initialize routes on first request
        if (!this.routesInitialized) {
            await this.initializeRoutes();
        }
        
        return this.app;
    }

    async fetch(request: Request, env: any, ctx: any): Promise<Response> {
        try {
            const app = await this.getApp();
            return app.fetch(request, env, ctx);
        } catch (error) {
            console.error('Unhandled error in fetch:', error);
            
            // Return JSON error response for unhandled errors
            return new Response(JSON.stringify({
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error instanceof Error ? error.message : 'Internal server error',
                    ...(process.env.NODE_ENV === 'development' && { stack: error instanceof Error ? error.stack : undefined })
                }
            }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-Token'
                }
            });
        }
    }
}

// Export Durable Objects
export { ZeroAgent, ZeroMCP, ZeroDB, ZeroDriver };

// Create and export the default worker instance
const worker = new WorkerClass();
export default worker;
