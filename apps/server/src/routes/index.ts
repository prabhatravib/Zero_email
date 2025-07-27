import type { HonoContext } from '../ctx';
import type { Hono } from 'hono';

export const registerRoutes = async (app: Hono<HonoContext>) => {
    // WebSocket routes are handled by Durable Objects at /agents/*
    app.all("/agents/*", async (c) => {
        const env = c.env as any;
        const url = new URL(c.req.url);
        const pathParts = url.pathname.split('/');
        const agentName = pathParts[pathParts.length - 1] || 'general';
        
        // Create or get the Durable Object
        const id = env.ZERO_AGENT.idFromName(agentName);
        const obj = env.ZERO_AGENT.get(id);
        
        // Forward the request to the Durable Object
        return obj.fetch(c.req.raw);
    });
    
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
    
    // Temporary debug endpoint
    app.get('/debug/test-websocket', (c) => {
        const env = c.env as any;
        const debugInfo: any = {
            envKeys: Object.keys(env),
            hasZeroAgent: !!env.ZERO_AGENT,
            zeroAgentType: typeof env.ZERO_AGENT,
            timestamp: new Date().toISOString()
        };
        
        if (env.ZERO_AGENT) {
            try {
                const testId = env.ZERO_AGENT.idFromName('test');
                debugInfo.canCreateId = true;
                debugInfo.testId = testId.toString();
            } catch (error) {
                debugInfo.canCreateId = false;
                debugInfo.idError = error instanceof Error ? error.message : String(error);
            }
        }
        
        return c.json(debugInfo);
    });
    
    // WebSocket routes are now handled by Durable Objects at /agents/*
    
    // Register auth routes
    app.route('/auth', publicRouter);
    
    // Register tRPC routes
    await registerTrpcRoutes(app);
}; 