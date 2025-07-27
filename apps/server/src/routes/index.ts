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
    
    // WebSocket route for agents
    app.get('/agents/zero-agent/:channel', (c) => {
        try {
            const { channel } = c.req.param();
            console.log('[Route] WebSocket request for channel:', channel);
            
            const env = c.env as any;
            console.log('[Route] Environment bindings:', Object.keys(env));
            
            if (!env.ZERO_AGENT) {
                console.error('[Route] ZERO_AGENT binding not found!');
                return new Response('ZERO_AGENT binding not configured', { status: 500 });
            }
            
            try {
                console.log('[Route] About to call idFromName with channel:', channel);
                const agentId = env.ZERO_AGENT.idFromName(channel);
                console.log('[Route] Created agent ID:', agentId.toString());
                
                console.log('[Route] About to get agent stub');
                const agent = env.ZERO_AGENT.get(agentId);
                console.log('[Route] Got agent stub, forwarding request');
                
                // Add logging before fetch
                console.log('[Route] About to call agent.fetch with request:', {
                    url: c.req.raw.url,
                    headers: Object.fromEntries(c.req.raw.headers.entries())
                });
                
                // Do not declare this function as async, and return the promise directly
                return agent.fetch(c.req.raw).catch((error: any) => {
                    console.error('[Route] Agent fetch error:', error);
                    console.error('[Route] Error stack:', error.stack);
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
                return new Response(JSON.stringify({ 
                    error: 'Failed to create agent', 
                    details: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined
                }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        } catch (outerError) {
            console.error('[Route] Outer error in WebSocket route:', outerError);
            return new Response(JSON.stringify({ 
                error: 'WebSocket route error', 
                details: outerError instanceof Error ? outerError.message : String(outerError),
                stack: outerError instanceof Error ? outerError.stack : undefined
            }), {
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