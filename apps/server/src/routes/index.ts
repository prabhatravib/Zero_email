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

    app.get('/test', testHandler as any)
       .get('/debug', debugHandler as any)
       .get('/debug-env', debugEnvHandler as any)
       .get('/health', healthHandler as any)
       .get('/api/test', testTrpcHandler as any)
       .get('/test-jwt', testJwtHandler as any)
       .get('/test-decode', testDecodeHandler as any)
       .get('/test-jwt-verify', testJwtVerifyHandler as any)
       .get('/test-trpc-auth', testTrpcAuthHandler as any)
       .get('/api/auth/check', authCheckHandler as any)
       .post('/api/auth/sign-in/social', signInSocialHandler as any);
    
    // WebSocket route for agents
    app.get('/agents/zero-agent/:channel', (c) => {
        const { channel } = c.req.param();
        const env = c.env as any;
        const agent = env.ZERO_AGENT.get(env.ZERO_AGENT.idFromName(channel));
        // Do not declare this function as async, and return the promise directly
        return agent.fetch(c.req.raw);
    });
    
    // Register auth routes
    app.route('/auth', publicRouter);
    
    // Register tRPC routes
    await registerTrpcRoutes(app);
}; 