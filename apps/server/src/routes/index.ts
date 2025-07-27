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
        console.log('[Route] WebSocket request for channel:', channel);
        
        const env = c.env as any;
        console.log('[Route] Environment bindings:', Object.keys(env));
        
        if (!env.ZERO_AGENT) {
            console.error('[Route] ZERO_AGENT binding not found!');
            return new Response('ZERO_AGENT binding not configured', { status: 500 });
        }
        
        try {
            const agentId = env.ZERO_AGENT.idFromName(channel);
            console.log('[Route] Created agent ID:', agentId);
            
            const agent = env.ZERO_AGENT.get(agentId);
            console.log('[Route] Got agent stub, forwarding request');
            
            // Do not declare this function as async, and return the promise directly
            return agent.fetch(c.req.raw).catch((error: any) => {
                console.error('[Route] Agent fetch error:', error);
                // Return error details in response for debugging
                return new Response(JSON.stringify({ 
                    error: 'Agent fetch failed', 
                    details: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined
                }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            });
        } catch (error) {
            console.error('[Route] Error creating agent:', error);
            return new Response(JSON.stringify({ error: 'Failed to create agent', details: error instanceof Error ? error.message : String(error) }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    });
    
    // Register auth routes
    app.route('/auth', publicRouter);
    
    // Register tRPC routes
    await registerTrpcRoutes(app);
}; 