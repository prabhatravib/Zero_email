import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { contextStorage } from 'hono/context-storage';

// Cloudflare Workers types - simplified for build compatibility
declare global {
    interface Env {
        [key: string]: any;
    }
}

// Temporary hardcoded values for testing
const GOOGLE_CLIENT_ID = '363401296279-vo7al766jmct0gcat24rrn2grv2jh1p5.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const VITE_PUBLIC_APP_URL = 'https://pitext-email.onrender.com';
const GOOGLE_REDIRECT_URI = 'https://pitext-mail.prabhatravib.workers.dev/auth/callback/google';

class WorkerClass {
    private app = new Hono()
        .use('*', cors({
            origin: (origin) => {
                // Allow requests with no origin (like mobile apps or curl requests)
                if (!origin) return '*';
                
                const allowedOrigins = [
                    'https://pitext-email.onrender.com',
                    'http://localhost:3000', 
                    'http://localhost:8787',
                    'http://localhost:5173',
                    'http://127.0.0.1:5173'
                ];
                
                return allowedOrigins.includes(origin) ? origin : '';
            },
            credentials: true,
            allowHeaders: ['Content-Type', 'Authorization', 'X-Session-Token', 'Origin', 'Accept', 'X-Requested-With'],
            allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
            exposeHeaders: ['X-Zero-Redirect', 'Set-Cookie'],
            maxAge: 86400, // 24 hours
        }))
        .use(contextStorage())
        .get('/test', (c) => c.json({ message: 'Server is working!' }))
        .get('/debug', (c) => c.json({ 
            message: 'Debug endpoint',
            env: {
                GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID ? 'set' : 'not set',
                GOOGLE_CLIENT_SECRET: GOOGLE_CLIENT_SECRET ? 'set' : 'not set',
                VITE_PUBLIC_APP_URL: VITE_PUBLIC_APP_URL,
                GOOGLE_REDIRECT_URI: GOOGLE_REDIRECT_URI
            }
        }))
        .get('/health', (c) => c.json({ 
            status: 'ok', 
            timestamp: new Date().toISOString(),
            cors: 'enabled',
            origin: c.req.header('Origin')
        }))
        .get('/api/auth/get-session', async (c) => {
            // Simple session endpoint that always returns null for now
            return c.json({ user: null });
        })
        .post('/api/auth/sign-in/social', async (c) => {
            // Simple social sign-in endpoint
            const body = await c.req.json();
            if (body.provider === 'google') {
                const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent('https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email')}&access_type=offline`;
                return c.json({ url: authUrl });
            }
            return c.json({ error: 'Unsupported provider' }, 400);
        });

    async fetch(request: Request, env: any, ctx: any): Promise<Response> {
        return this.app.fetch(request);
    }
}

// Simple Durable Objects for Google OAuth only
class ZeroAgent {
    constructor(state: any, env: any) {}
}

class ZeroMCP {
    constructor(state: any, env: any) {}
}

class ZeroDB {
    constructor(state: any, env: any) {}
}

class ZeroDriver {
    constructor(state: any, env: any) {}
}

// Export Durable Objects
export { ZeroAgent, ZeroMCP, ZeroDB, ZeroDriver };

// Create and export the default worker instance
const worker = new WorkerClass();
export default worker;
