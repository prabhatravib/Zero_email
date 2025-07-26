import { testHandler, testDbHandler, testTrpcHandler } from './test';
import { debugHandler } from './debug';
import { healthHandler } from './health';
import { registerTrpcRoutes } from './trpc';
import type { HonoContext } from '../ctx';
import type { Hono } from 'hono';

export const registerRoutes = (app: Hono<HonoContext>) => {
    app.get('/test', testHandler)
       .get('/test-db', testDbHandler)
       .get('/debug', debugHandler)
       .get('/health', healthHandler)
       .get('/api/test', testTrpcHandler);
    
    registerTrpcRoutes(app);
}; 