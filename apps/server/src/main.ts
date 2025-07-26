import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { contextStorage } from 'hono/context-storage';
import { getZeroDB } from './lib/server-utils';

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
            // Set proper headers to prevent content decoding issues
            c.header('Content-Type', 'application/json');
            c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
            c.header('Pragma', 'no-cache');
            c.header('Expires', '0');
            
            try {
                // Get session ID from cookies
                const cookies = c.req.header('Cookie') || '';
                const sessionMatch = cookies.match(/session=([^;]+)/);
                
                if (!sessionMatch) {
                    console.log('No session cookie found');
                    return c.json({ user: null });
                }
                
                const sessionId = sessionMatch[1];
                console.log('Session ID found:', sessionId);
                
                // Retrieve session data from ZeroDB Durable Object
                try {
                    const env = c.env as any;
                    const db = env.ZERO_DB;
                    const sessionObj = db.get(db.idFromName('sessions')); // Use same fixed ID
                    
                    const response = await sessionObj.fetch(`http://localhost/get?sessionId=${encodeURIComponent(sessionId)}`);
                    
                    if (response.ok) {
                        const sessionData = await response.json();
                        
                        // Check if session is expired
                        if (sessionData.expires_at && Date.now() > sessionData.expires_at) {
                            console.log('Session expired');
                            return c.json({ user: null });
                        }
                        
                        console.log('Valid session found for:', sessionData.email);
                        return c.json({
                            user: {
                                id: sessionData.email,
                                email: sessionData.email,
                                name: sessionData.name,
                                image: sessionData.picture,
                            }
                        });
                    } else {
                        console.log('Session not found in ZeroDB');
                        return c.json({ user: null });
                    }
                } catch (dbError) {
                    console.error('Failed to retrieve session from ZeroDB:', dbError);
                    return c.json({ user: null });
                }
                
            } catch (error) {
                console.error('Get session error:', error);
                return c.json({ user: null });
            }
        })
        .post('/api/auth/sign-in/social', async (c) => {
            try {
                // Set proper headers to prevent content decoding issues
                c.header('Content-Type', 'application/json');
                c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
                c.header('Pragma', 'no-cache');
                c.header('Expires', '0');
                
                let body;
                let rawBody;
                try {
                    rawBody = await c.req.text();
                    console.log('Raw request body received:', rawBody);
                    
                    if (!rawBody) {
                        console.log('No request body received');
                        return c.json({ error: 'No request body provided' }, 400);
                    }
                    
                    body = JSON.parse(rawBody);
                    console.log('Social sign-in request body:', JSON.stringify(body, null, 2));
                    console.log('Social sign-in request body type:', typeof body);
                    console.log('Social sign-in request body.provider:', body?.provider);
                } catch (parseError) {
                    console.error('Failed to parse request body as JSON:', parseError);
                    console.log('Raw request body that failed to parse:', rawBody);
                    return c.json({ error: 'Invalid JSON in request body' }, 400);
                }
                
                if (body.provider === 'google') {
                    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent('https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email')}&access_type=offline`;
                    
                    console.log('Generated Google OAuth URL:', authUrl);
                    return c.json({ url: authUrl });
                }
                
                return c.json({ error: 'Unsupported provider' }, 400);
            } catch (error) {
                console.error('Social sign-in error:', error);
                let errorMessage = 'Unknown error';
                
                if (error instanceof Error) {
                    errorMessage = error.message;
                } else if (typeof error === 'string') {
                    errorMessage = error;
                } else if (error && typeof error === 'object') {
                    errorMessage = JSON.stringify(error);
                }
                
                return c.json({ error: 'Internal server error', details: errorMessage }, 500);
            }
        })
        .get('/auth/callback/google', async (c) => {
            // Handle Google OAuth callback
            const code = c.req.query('code');
            const error = c.req.query('error');

            if (error) {
                return c.redirect(`${VITE_PUBLIC_APP_URL}/auth/callback/google?error=${encodeURIComponent(error)}`);
            }

            if (!code) {
                return c.redirect(`${VITE_PUBLIC_APP_URL}/auth/callback/google?error=no_code`);
            }

            try {
                console.log('Processing Google OAuth callback with code:', code);
                
                // Exchange code for tokens
                const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        code,
                        client_id: GOOGLE_CLIENT_ID,
                        client_secret: GOOGLE_CLIENT_SECRET,
                        redirect_uri: GOOGLE_REDIRECT_URI,
                        grant_type: 'authorization_code',
                    }),
                });

                if (!tokenResponse.ok) {
                    console.error('Token exchange failed:', await tokenResponse.text());
                    return c.redirect(`${VITE_PUBLIC_APP_URL}/auth/callback/google?error=token_exchange_failed`);
                }

                const tokenData = await tokenResponse.json() as {
                    access_token: string;
                    refresh_token: string;
                    expires_in: number;
                };
                console.log('Token exchange successful');

                // Get user info
                const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                    headers: {
                        Authorization: `Bearer ${tokenData.access_token}`,
                    },
                });

                if (!userResponse.ok) {
                    console.error('User info fetch failed:', await userResponse.text());
                    return c.redirect(`${VITE_PUBLIC_APP_URL}/auth/callback/google?error=user_info_failed`);
                }

                const userData = await userResponse.json() as {
                    email: string;
                    name: string;
                    picture: string;
                };
                console.log('User info fetched:', userData.email);

                // Create a session ID
                const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                // Store session data in ZeroDB Durable Object
                try {
                    const env = c.env as any;
                    const db = env.ZERO_DB;
                    const sessionObj = db.get(db.idFromName('sessions')); // Use fixed ID for sessions
                    
                    // Store session data
                    const sessionData = {
                        email: userData.email,
                        name: userData.name,
                        picture: userData.picture,
                        access_token: tokenData.access_token,
                        refresh_token: tokenData.refresh_token,
                        expires_at: Date.now() + (tokenData.expires_in * 1000),
                    };
                    
                    await sessionObj.fetch('http://localhost/store', {
                        method: 'POST',
                        body: JSON.stringify({ sessionId, sessionData }),
                    });
                    
                    console.log('Session stored in ZeroDB');
                } catch (dbError) {
                    console.error('Failed to store session in ZeroDB:', dbError);
                    // Continue anyway - session will be validated later
                }

                // Set secure HTTP-only cookie with session ID
                c.header('Set-Cookie', `session=${sessionId}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${tokenData.expires_in}`);

                // Redirect to frontend with success (no sensitive data in URL)
                return c.redirect(`${VITE_PUBLIC_APP_URL}/auth/callback/google?success=true&email=${encodeURIComponent(userData.email)}`);

            } catch (error) {
                console.error('OAuth callback error:', error);
                return c.redirect(`${VITE_PUBLIC_APP_URL}/auth/callback/google?error=callback_error`);
            }
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
    private state: any;
    private env: any;
    private sessions: Map<string, any>;

    constructor(state: any, env: any) {
        this.state = state;
        this.env = env;
        this.sessions = new Map();
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;

        if (path === '/store' && request.method === 'POST') {
            // Store session data
            const body = await request.json() as { sessionId: string; sessionData: any };
            const { sessionId, sessionData } = body;
            if (!sessionId || !sessionData) {
                return new Response('Session ID and data required', { status: 400 });
            }
            
            // Store in persistent storage with session ID as key
            await this.state.storage.put(sessionId, sessionData);
            
            return new Response(JSON.stringify({ success: true }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (path === '/get' && request.method === 'GET') {
            // Retrieve session data
            const sessionId = url.searchParams.get('sessionId');
            if (!sessionId) {
                return new Response('Session ID not provided', { status: 400 });
            }
            
            const sessionData = await this.state.storage.get(sessionId);
            
            if (sessionData) {
                return new Response(JSON.stringify(sessionData), {
                    headers: { 'Content-Type': 'application/json' }
                });
            } else {
                return new Response('Session not found', { status: 404 });
            }
        }

        return new Response('Not found', { status: 404 });
    }
}

class ZeroDriver {
    constructor(state: any, env: any) {}
}

// Export Durable Objects
export { ZeroAgent, ZeroMCP, ZeroDB, ZeroDriver };

// Create and export the default worker instance
const worker = new WorkerClass();
export default worker;
