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
        { registerTrpcRoutes },
        { authCheckHandler },
        { signInSocialHandler }
    ] = await Promise.all([
        import('./test'),
        import('./debug'),
        import('./auth'),
        import('./debug-env'),
        import('./health'),
        import('./trpc'),
        import('./auth-check'),
        import('./auth/sign-in-social')
    ]);

    app.get('/test', testHandler)
       .get('/debug', debugHandler)
       .get('/debug-env', debugEnvHandler)
       .get('/health', healthHandler)
       .get('/api/test', testTrpcHandler)
       .get('/test-jwt', testJwtHandler)
       .get('/test-decode', testDecodeHandler)
       .get('/test-jwt-verify', testJwtVerifyHandler)
       .get('/test-trpc-auth', testTrpcAuthHandler)
       .get('/api/auth/check', authCheckHandler)
       .post('/api/auth/sign-in/social', signInSocialHandler);
    
    // WebSocket route for agents
    app.get('/agents/:agentId/:channel', (c) => {
        const { agentId } = c.req.param();
        const env = c.env as any;
        const agent = env.ZERO_AGENT.get(env.ZERO_AGENT.idFromName(agentId));
        // Do not declare this function as async, and return the promise directly
        return agent.fetch(c.req.raw);
    });
    
    // Register auth routes
    app.route('/auth', publicRouter);
    
    // Register tRPC routes
    await registerTrpcRoutes(app);
}; 