import type { HonoContext } from '../ctx';
import type { Hono } from 'hono';

export const registerRoutes = async (app: Hono<HonoContext>) => {
    // Lazy load route handlers to avoid startup overhead
    const [
        { testHandler, testTrpcHandler, testJwtHandler, testDecodeHandler, testJwtVerifyHandler, testTrpcAuthHandler },
        { debugHandler },
        { publicRouter },
        { debugEnvHandler },
        { healthHandler },
        { registerTrpcRoutes }
    ] = await Promise.all([
        import('./test'),
        import('./debug'),
        import('./auth'),
        import('./debug-env'),
        import('./health'),
        import('./trpc')
    ]);

    app.get('/test', testHandler)
       .get('/debug', debugHandler)
       .get('/debug-env', debugEnvHandler)
       .get('/health', healthHandler)
       .get('/api/test', testTrpcHandler)
       .get('/test-jwt', testJwtHandler)
       .get('/test-decode', testDecodeHandler)
       .get('/test-jwt-verify', testJwtVerifyHandler)
       .get('/test-trpc-auth', testTrpcAuthHandler);
    
    // WebSocket route for agents
    app.get('/agents/:agentId/:channel', async (c) => {
        const { agentId, channel } = c.req.param();
        const env = c.env as any;
        
        // Forward to Durable Object
        const agent = env.ZERO_AGENT.get(env.ZERO_AGENT.idFromName(agentId));
        
        // Forward the original request directly to avoid body cloning
        const response = await agent.fetch(c.req.raw);
        
        return response;
    });
    
    // Register auth routes
    app.route('/auth', publicRouter);
    
    // Register tRPC routes
    await registerTrpcRoutes(app);
}; 