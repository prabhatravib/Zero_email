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
            
            // Check if this is a WebSocket upgrade request
            if (c.req.header('Upgrade')?.toLowerCase() === 'websocket') {
                try {
                    console.log('[Route] WebSocket upgrade request detected');
                    const agentId = env.ZERO_AGENT.idFromName(channel);
                    console.log('[Route] Created agent ID:', agentId.toString());
                    
                    const agent = env.ZERO_AGENT.get(agentId);
                    console.log('[Route] Got agent stub');
                    
                    // Create a WebSocket pair and pass the *server* half to the Durable Object.
                    const pair = new WebSocketPair();
                    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

                    // Construct the request target as a plain string URL (MUST NOT be a Request/URL object)
                    const targetUrl = "https://zero-agent/session";

                    console.log('[Route] about to stub.fetch');
                    console.log('[Route] typeof input =', typeof targetUrl); // should be 'string'
                    console.log('[Route] is Request =', targetUrl instanceof Request); // should be false
                    console.log('[Route] server exists? ', !!server);
                    console.log('[Route] stub id =', agentId.toString());

                    // Forward the server WebSocket to the Durable Object (per CF recipe)
                    agent.fetch(targetUrl, {
                      method: 'GET',
                      headers: { 'Upgrade': 'websocket' },
                      webSocket: server as any,
                    }).catch((err: any) => {
                      console.error('[Route] Agent fetch error:', err);
                    });

                    // Return the client side to the browser
                    return new Response(null, { status: 101, webSocket: client });
                } catch (error) {
                    console.error('[Route] Error in WebSocket handling:', error);
                    return new Response(JSON.stringify({ 
                        error: 'WebSocket handling failed', 
                        details: error instanceof Error ? error.message : String(error),
                        stack: error instanceof Error ? error.stack : undefined
                    }), {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            } else {
                // Handle regular HTTP requests
                try {
                    console.log('[Route] Regular HTTP request');
                    const agentId = env.ZERO_AGENT.idFromName(channel);
                    console.log('[Route] Created agent ID:', agentId.toString());
                    
                    const agent = env.ZERO_AGENT.get(agentId);
                    console.log('[Route] Got agent stub, forwarding request');
                    
                    return agent.fetch(c.req.raw).catch((error: any) => {
                        console.error('[Route] Agent fetch error:', error);
                        console.error('[Route] Error stack:', error.stack);
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
    
    // New simplified WebSocket hand-off route (see Cloudflare recipe)
    app.get('/agents/:name', (c) => {
        const { name } = c.req.param();

        // 1. Create the socket pair
        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

        // 2. Forward the server half to the Durable Object using plain string URL
        const id = c.env.ZERO_AGENT.idFromName(name);
        const doStub = c.env.ZERO_AGENT.get(id);

        // Fire-and-forget – do NOT await (use plain URL string per CF recipe)
        doStub.fetch('https://zero-agent/session', {
            method: 'GET',
            headers: { 'Upgrade': 'websocket' }, // explicit upgrade keeps frameworks honest
            webSocket: server as any,
        }).catch(console.error);

        // 3. Return the client half to the browser
        return new Response(null, { status: 101, webSocket: client });
    });
    
    // Register auth routes
    app.route('/auth', publicRouter);
    
    // Register tRPC routes
    await registerTrpcRoutes(app);
}; 