import { cors } from 'hono/cors';
import { config } from '../config';
import type { HonoContext } from '../ctx';

export const corsMiddleware = cors({
    origin: (origin) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return '*';
        
        return config.cors.allowedOrigins.includes(origin) ? origin : '';
    },
    credentials: true,
    allowHeaders: config.cors.allowHeaders,
    allowMethods: config.cors.allowMethods,
    exposeHeaders: config.cors.exposeHeaders,
    maxAge: config.cors.maxAge,
}); 