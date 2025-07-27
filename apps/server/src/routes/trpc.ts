import { trpcServer } from '@hono/trpc-server';
import { trpcContextMiddleware } from '../middleware/trpc-context';
import type { HonoContext } from '../ctx';
import type { Hono } from 'hono';

export const registerTrpcRoutes = async (app: Hono<HonoContext>) => {
    console.log('🔍 Registering tRPC routes...');
    try {
        // Mount middleware first, then tRPC server with wildcard path and endpoint
        app.use('/api/trpc/*', trpcContextMiddleware)
           .use('/api/trpc/*', trpcServer({
               router: async () => {
                   // Lazy load the appRouter to avoid startup overhead
                   const { appRouter } = await import('../trpc');
                   return appRouter;
               },
               endpoint: '/api/trpc',
               createContext: (_opts, c) => {
                   console.log('🔍 tRPC createContext - Reading session from Hono context');
                   const sessionUser = c.get('sessionUser');
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
    }
}; 