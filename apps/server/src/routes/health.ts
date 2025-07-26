import type { HonoContext } from '../ctx';

export const healthHandler = (c: HonoContext) => c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    cors: 'enabled',
    origin: c.req.header('Origin')
}); 