import { testHandler, testTrpcHandler, testJwtHandler, testDecodeHandler, testJwtVerifyHandler, testTrpcAuthHandler } from './test';
import { debugHandler } from './debug';
import { publicRouter } from './auth';
import { debugEnvHandler } from './debug-env';
import { healthHandler } from './health';
import { registerTrpcRoutes } from './trpc';
import type { HonoContext } from '../ctx';
import type { Hono } from 'hono';

export const registerRoutes = (app: Hono<HonoContext>) => {
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
        return agent.fetch(c.req.raw);
    });
    
    // Register auth routes
    app.route('/auth', publicRouter);
    
    // Register tRPC routes
    registerTrpcRoutes(app);
}; 