import { cors } from 'hono/cors';
import { createConfig } from '../config';
import type { HonoContext } from '../ctx';

export const corsMiddleware = cors({
    origin: (origin, c) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return '*';
        
        const env = c.env as unknown as Record<string, string>;
        const config = createConfig(env);
        return config.cors.allowedOrigins.includes(origin) ? origin : '';
    },
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization', 'X-Session-Token', 'Origin', 'Accept', 'X-Requested-With'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    exposeHeaders: ['X-Zero-Redirect', 'Set-Cookie'],
    maxAge: 86400, // 24 hours
}); 