import { trpcServer } from '@hono/trpc-server';
import { trpcContextMiddleware } from '../middleware/trpc-context';
import type { HonoContext } from '../ctx';
import type { Hono } from 'hono';

export const registerTrpcRoutes = async (app: Hono<HonoContext>) => {
    console.log('🔍 Registering tRPC routes...');
    try {
        // Eagerly load the router module (this can still be dynamic)
        const { appRouter } = await import('../trpc');
        console.log('🔍 tRPC - Router loaded successfully');
        
        // Mount middleware first, then tRPC server with wildcard path and endpoint
        app.use('/api/trpc/*', trpcContextMiddleware)
           .use('/api/trpc/*', trpcServer({
               router: appRouter, // Pass the resolved router instance
               endpoint: '/api/trpc',
               createContext: (_opts, c) => {
                   console.log('🔍 tRPC createContext - Reading session from Hono context');
                   const sessionUser = c.var.sessionUser;
                   console.log('🔍 tRPC createContext - Session user:', sessionUser ? 'present' : 'null');
                   
                   return {
                       c,
                       sessionUser: sessionUser || undefined,
                   };
               },
           }));
        
        console.log('✅ tRPC routes registered successfully');
    } catch (error) {
        console.error('❌ Failed to register tRPC routes:', error);
        throw error; // Re-throw to ensure the error is handled by the global error handler
    }
}; 