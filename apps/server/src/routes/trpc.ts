import { trpcServer } from '@hono/trpc-server';
import { appRouter } from '../trpc';
import { trpcContextMiddleware } from '../middleware/trpc-context';
import type { HonoContext } from '../ctx';
import type { Hono } from 'hono';

export const registerTrpcRoutes = (app: Hono<HonoContext>) => {
    console.log('🔍 Registering tRPC routes...');
    try {
        // Mount middleware first, then tRPC server with wildcard path and endpoint
        app.use('/api/trpc/*', trpcContextMiddleware)
           .use('/api/trpc/*', trpcServer({
               router: appRouter,
               endpoint: '/api/trpc',
           }));
        
        console.log('✅ tRPC routes registered successfully');
    } catch (error) {
        console.error('❌ Failed to register tRPC routes:', error);
    }
}; 