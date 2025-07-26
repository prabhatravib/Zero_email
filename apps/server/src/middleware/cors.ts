import { cors } from 'hono/cors';
import type { HonoContext } from '../ctx';

export const corsMiddleware = cors({
    origin: (origin) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return '*';
        
        const allowedOrigins = [
            'https://pitext-email.onrender.com',
            'http://localhost:3000',
            'http://localhost:5173'
        ];
        
        return allowedOrigins.includes(origin) ? origin : '';
    },
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization', 'X-Session-Token'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['X-Zero-Redirect', 'Set-Cookie'],
    maxAge: 86400,
}); 