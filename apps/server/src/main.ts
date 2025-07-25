import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { contextStorage } from 'hono/context-storage';
import { aiRouter } from './routes/ai';
import { env, WorkerEntrypoint, DurableObject } from 'cloudflare:workers';
import { appRouter } from './trpc';
import { createAuth } from './lib/auth';
import { getZeroDB } from './lib/server-utils';
import type { HonoContext, HonoVariables } from './ctx';

import { trpcServer } from '@hono/trpc-server';

// Simple Durable Objects for Google OAuth only
class ZeroAgent extends DurableObject {
    constructor(state: any, env: any) {
        super(state, env);
    }
}

class ZeroMCP extends DurableObject {
    constructor(state: any, env: any) {
        super(state, env);
    }
}

class ZeroDB extends DurableObject {
    constructor(state: any, env: any) {
        super(state, env);
    }

    async createUser(userData: {
        id: string;
        email: string;
        name: string;
        picture: string;
        emailVerified: boolean;
        createdAt: Date;
        updatedAt: Date;
    }) {
        await this.state.storage.put(`user:${userData.id}`, {
            ...userData,
            createdAt: userData.createdAt.toISOString(),
            updatedAt: userData.updatedAt.toISOString(),
        });
        return userData;
    }

    async findUser() {
        const userId = await this.state.storage.get('userId') as string;
        if (!userId) return null;

        const userData = await this.state.storage.get(`user:${userId}`);
        if (!userData) return null;

        return {
            ...userData,
            createdAt: new Date(userData.createdAt),
            updatedAt: new Date(userData.updatedAt),
        };
    }

    async updateUser(updates: Partial<{
        defaultConnectionId: string | undefined;
        name: string;
        email: string;
        picture: string;
        customPrompt: string;
        phoneNumber: string;
        phoneNumberVerified: boolean;
    }>) {
        const userId = await this.state.storage.get('userId') as string;
        if (!userId) throw new Error('User not found');

        const userData = await this.state.storage.get(`user:${userId}`);
        if (!userData) throw new Error('User not found');

        const updatedUser = {
            ...userData,
            ...updates,
            updatedAt: new Date().toISOString(),
        };

        await this.state.storage.put(`user:${userId}`, updatedUser);
        return updatedUser;
    }

    async createConnection(connectionData: {
        id: string;
        userId: string;
        email: string;
        name: string;
        picture: string;
        accessToken: string;
        refreshToken: string;
        scope: string;
        providerId: 'google' | 'microsoft';
        expiresAt: Date;
        createdAt: Date;
        updatedAt: Date;
    }) {
        await this.state.storage.put(`connection:${connectionData.id}`, {
            ...connectionData,
            expiresAt: connectionData.expiresAt.toISOString(),
            createdAt: connectionData.createdAt.toISOString(),
            updatedAt: connectionData.updatedAt.toISOString(),
        });

        // Store connection ID in user's connections list
        const connections = await this.state.storage.get(`connections:${connectionData.userId}`) as string[] || [];
        if (!connections.includes(connectionData.id)) {
            connections.push(connectionData.id);
            await this.state.storage.put(`connections:${connectionData.userId}`, connections);
        }

        return connectionData;
    }

    async findUserConnection(connectionId: string) {
        const connectionData = await this.state.storage.get(`connection:${connectionId}`);
        if (!connectionData) return null;

        return {
            ...connectionData,
            expiresAt: new Date(connectionData.expiresAt),
            createdAt: new Date(connectionData.createdAt),
            updatedAt: new Date(connectionData.updatedAt),
        };
    }

    async findFirstConnection() {
        const userId = await this.state.storage.get('userId') as string;
        if (!userId) return null;

        const connections = await this.state.storage.get(`connections:${userId}`) as string[] || [];
        if (connections.length === 0) return null;

        return await this.findUserConnection(connections[0]);
    }

    async findManyConnections() {
        const userId = await this.state.storage.get('userId') as string;
        if (!userId) return [];

        const connectionIds = await this.state.storage.get(`connections:${userId}`) as string[] || [];
        const connections = [];

        for (const connectionId of connectionIds) {
            const connection = await this.findUserConnection(connectionId);
            if (connection) {
                connections.push(connection);
            }
        }

        return connections;
    }

    async updateConnection(connectionId: string, updates: Partial<{
        accessToken: string | null;
        refreshToken: string | null;
        name: string;
        picture: string;
        scope: string;
        expiresAt: Date;
    }>) {
        const connectionData = await this.state.storage.get(`connection:${connectionId}`);
        if (!connectionData) throw new Error('Connection not found');

        const updatedConnection = {
            ...connectionData,
            ...updates,
            updatedAt: new Date().toISOString(),
            ...(updates.expiresAt && { expiresAt: updates.expiresAt.toISOString() }),
        };

        await this.state.storage.put(`connection:${connectionId}`, updatedConnection);
        return updatedConnection;
    }

    async deleteConnection(connectionId: string) {
        const connectionData = await this.state.storage.get(`connection:${connectionId}`);
        if (!connectionData) return;

        // Remove from user's connections list
        const userId = connectionData.userId;
        const connections = await this.state.storage.get(`connections:${userId}`) as string[] || [];
        const updatedConnections = connections.filter(id => id !== connectionId);
        await this.state.storage.put(`connections:${userId}`, updatedConnections);

        // Delete connection data
        await this.state.storage.delete(`connection:${connectionId}`);
    }

    async deleteActiveConnection() {
        const userId = this.state.storage.get('userId') as string;
        if (!userId) return;

        const userData = await this.findUser();
        if (!userData?.defaultConnectionId) return;

        await this.deleteConnection(userData.defaultConnectionId);
        await this.updateUser({ defaultConnectionId: undefined });
    }

    // Handle fetch requests for Durable Object communication
    async fetch(request: Request): Promise<Response> {
        try {
            const url = new URL(request.url);
            const path = url.pathname;

            if (request.method === 'POST' && path === '/') {
                // Handle initialization
                const body = await request.json();
                if (body.action === 'init') {
                    await this.state.storage.put('userId', body.userId);
                    return new Response(JSON.stringify({ success: true }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            }

            // Handle RPC calls
            if (path === '/rpc') {
                const body = await request.json();
                const { method, params } = body;

                if (typeof this[method] === 'function') {
                    try {
                        const result = await this[method](...params);
                        return new Response(JSON.stringify({ success: true, result }), {
                            headers: { 'Content-Type': 'application/json' }
                        });
                    } catch (error) {
                        return new Response(JSON.stringify({
                            success: false,
                            error: error instanceof Error ? error.message : 'Unknown error'
                        }), {
                            status: 500,
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }
                } else {
                    return new Response(JSON.stringify({
                        success: false,
                        error: `Method ${method} not found`
                    }), {
                        status: 404,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            }

            return new Response('Not found', { status: 404 });
        } catch (error) {
            console.error('ZeroDB fetch error:', error);
            return new Response(JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
}

class ZeroDriver extends DurableObject {
    constructor(state: any, env: any) {
        super(state, env);
    }
}

// Type definitions for Google OAuth responses
interface GoogleTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
    scope: string;
}

interface GoogleUserInfo {
    id: string;
    email: string;
    verified_email: boolean;
    name: string;
    given_name: string;
    family_name: string;
    picture: string;
    locale: string;
}

export default class extends WorkerEntrypoint<typeof env> {
    private app = new Hono<HonoContext>()
        .use('*', cors({
            origin: (origin) => {
                if (!origin) return null;
                let hostname: string;
                try {
                    hostname = new URL(origin).hostname;
                } catch {
                    return null;
                }
                // Allow Render domains and localhost for development
                if (hostname === 'pitext-email.onrender.com' ||
                    hostname.endsWith('.onrender.com') ||
                    hostname === 'localhost' ||
                    hostname === '127.0.0.1') {
                    return origin;
                }
                return null;
            },
            credentials: true,
            allowHeaders: ['Content-Type', 'Authorization', 'X-Session-Token'],
            exposeHeaders: ['X-Zero-Redirect'],
        }))
        .use(contextStorage())
        .use('*', async (c, next) => {
            // Set up context variables
            c.set('auth', createAuth());

            // Get session from cookie or header
            const sessionToken = c.req.header('X-Session-Token') ||
                c.req.header('Cookie')?.split(';')
                    .find(cookie => cookie.trim().startsWith('session='))
                    ?.split('=')[1];

            if (sessionToken) {
                try {
                    const sessionData = JSON.parse(atob(sessionToken));
                    if (sessionData.exp && Date.now() <= sessionData.exp) {
                        c.set('sessionUser', {
                            id: sessionData.userId,
                            email: sessionData.email,
                            name: sessionData.name,
                            image: sessionData.picture,
                            emailVerified: true,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        });
                    }
                } catch (error) {
                    console.error('Session parsing error:', error);
                }
            }

            await next();
        })
        .get('/test', (c) => c.json({ message: 'Server is working!' }))
        .route('/ai', aiRouter)
        .get('/api/public/providers', async (c) => {
            // Return available authentication providers
            const googleClientId = env.GOOGLE_CLIENT_ID;
            const googleClientSecret = env.GOOGLE_CLIENT_SECRET;

            const allProviders = [
                {
                    id: 'google',
                    name: 'Google',
                    enabled: !!(googleClientId && googleClientSecret),
                    required: true,
                    envVarInfo: [
                        {
                            name: 'GOOGLE_CLIENT_ID',
                            description: 'Google OAuth Client ID',
                            required: true,
                            defaultValue: 'your-google-client-id'
                        },
                        {
                            name: 'GOOGLE_CLIENT_SECRET',
                            description: 'Google OAuth Client Secret',
                            required: true,
                            defaultValue: 'your-google-client-secret'
                        }
                    ],
                    envVarStatus: [
                        {
                            name: 'GOOGLE_CLIENT_ID',
                            set: !!googleClientId,
                            source: 'environment',
                            defaultValue: 'your-google-client-id'
                        },
                        {
                            name: 'GOOGLE_CLIENT_SECRET',
                            set: !!googleClientSecret,
                            source: 'environment',
                            defaultValue: 'your-google-client-secret'
                        }
                    ],
                    isCustom: false
                }
            ];

            return c.json({
                allProviders
            });
        })
        .post('/monitoring/sentry', async (c) => {
            // Handle Sentry monitoring data
            // For now, just return success to prevent 404 errors
            return c.json({ success: true });
        })
        .get('/auth/sign-in/social/google', async (c) => {
            // Simple Google OAuth redirect
            const clientId = env.GOOGLE_CLIENT_ID;
            const redirectUri = env.GOOGLE_REDIRECT_URI || `${env.VITE_PUBLIC_APP_URL}/auth/callback/google`;
            const scope = 'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline`;

            return c.redirect(authUrl);
        })
        .get('/api/auth/sign-in/social/google', async (c) => {
            // Simple Google OAuth redirect
            const clientId = env.GOOGLE_CLIENT_ID;
            const redirectUri = env.GOOGLE_REDIRECT_URI || `${env.VITE_PUBLIC_APP_URL}/auth/callback/google`;
            const scope = 'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline`;

            return c.redirect(authUrl);
        })
        .get('/auth/callback/google', async (c) => {
            // Handle Google OAuth callback
            const code = c.req.query('code');
            const error = c.req.query('error');

            if (error) {
                return c.redirect(`${env.VITE_PUBLIC_APP_URL}/auth/callback/google?error=${encodeURIComponent(error)}`);
            }

            if (!code) {
                return c.redirect(`${env.VITE_PUBLIC_APP_URL}/auth/callback/google?error=no_code`);
            }

            try {
                // Exchange code for tokens
                const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        client_id: env.GOOGLE_CLIENT_ID,
                        client_secret: env.GOOGLE_CLIENT_SECRET,
                        code: code,
                        grant_type: 'authorization_code',
                        redirect_uri: env.GOOGLE_REDIRECT_URI || `${env.VITE_PUBLIC_APP_URL}/auth/callback/google`,
                    }),
                });

                if (!tokenResponse.ok) {
                    console.error('Token exchange failed:', await tokenResponse.text());
                    return c.redirect(`${env.VITE_PUBLIC_APP_URL}/auth/callback/google?error=token_exchange_failed`);
                }

                const tokenData = await tokenResponse.json() as GoogleTokenResponse;

                // Get user info
                const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                    headers: {
                        'Authorization': `Bearer ${tokenData.access_token}`,
                    },
                });

                if (!userResponse.ok) {
                    console.error('User info fetch failed:', await userResponse.text());
                    return c.redirect(`${env.VITE_PUBLIC_APP_URL}/auth/callback/google?error=user_info_failed`);
                }

                const userData = await userResponse.json() as GoogleUserInfo;

                // Store connection data in session token (simpler approach)
                console.log('Storing connection data in session token for user:', userData.id);

                // Create a session token with connection data included
                const connectionId = `${userData.id}_${userData.email}`;
                const sessionToken = btoa(JSON.stringify({
                    userId: userData.id,
                    email: userData.email,
                    name: userData.name,
                    picture: userData.picture,
                    access_token: tokenData.access_token,
                    refresh_token: tokenData.refresh_token,
                    connectionId: connectionId,
                    providerId: 'google',
                    scope: tokenData.scope,
                    expiresAt: Date.now() + (tokenData.expires_in * 1000),
                    exp: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
                }));

                // Set session cookie and redirect to success
                const redirectUrl = `${env.VITE_PUBLIC_APP_URL}/auth/callback/google?success=true&email=${encodeURIComponent(userData.email)}&session=${encodeURIComponent(sessionToken)}`;

                const response = c.redirect(redirectUrl);
                // For cross-domain setup, we need to set the cookie on the frontend domain
                // The session token is passed in the URL and will be set by the frontend
                // No server-side cookie setting here since it won't be accessible to the frontend

                return response;

            } catch (error) {
                console.error('OAuth callback error:', error);
                return c.redirect(`${env.VITE_PUBLIC_APP_URL}/auth/callback/google?error=callback_error`);
            }
        })
        .post('/api/auth/sign-in/social', async (c) => {
            // Handle social sign-in request
            const body = await c.req.json();
            if (body.provider === 'google') {
                const clientId = env.GOOGLE_CLIENT_ID;
                const redirectUri = env.GOOGLE_REDIRECT_URI || `${env.VITE_PUBLIC_APP_URL}/auth/callback/google`;
                const scope = 'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

                const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline`;

                return c.json({ url: authUrl });
            }
            return c.json({ error: 'Unsupported provider' }, 400);
        })
        .get('/api/auth/get-session', async (c) => {
            // Get session from custom header (for cross-domain setup) or cookie
            const sessionToken = c.req.header('X-Session-Token') ||
                c.req.header('Cookie')?.split(';')
                    .find(cookie => cookie.trim().startsWith('session='))
                    ?.split('=')[1];

            console.log('Session check - X-Session-Token header:', c.req.header('X-Session-Token') ? 'found' : 'not found');
            console.log('Session check - Cookie header:', c.req.header('Cookie'));
            console.log('Session check - Extracted session:', sessionToken ? 'found' : 'not found');

            if (!sessionToken) {
                return c.json({ user: null });
            }

            try {
                const sessionData = JSON.parse(atob(sessionToken));
                console.log('Session check - Parsed session data:', {
                    userId: sessionData.userId,
                    email: sessionData.email,
                    exp: sessionData.exp,
                    currentTime: Date.now()
                });

                // Check if session is expired
                if (sessionData.exp && Date.now() > sessionData.exp) {
                    console.log('Session check - Session expired');
                    return c.json({ user: null });
                }

                console.log('Session check - Valid session found');
                return c.json({
                    user: {
                        id: sessionData.userId,
                        email: sessionData.email,
                        name: sessionData.name,
                        picture: sessionData.picture,
                    }
                });
            } catch (error) {
                console.error('Session parsing error:', error);
                return c.json({ user: null });
            }
        })
        .post('/api/auth/exchange-code', async (c) => {
            // Handle OAuth code exchange
            const body = await c.req.json();
            const { code } = body;

            if (!code) {
                return c.json({ success: false, error: 'No authorization code provided' }, 400);
            }

            try {
                // Exchange code for tokens
                const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        client_id: env.GOOGLE_CLIENT_ID,
                        client_secret: env.GOOGLE_CLIENT_SECRET,
                        code: code,
                        grant_type: 'authorization_code',
                        redirect_uri: env.GOOGLE_REDIRECT_URI || `${env.VITE_PUBLIC_APP_URL}/auth/callback/google`,
                    }),
                });

                if (!tokenResponse.ok) {
                    console.error('Token exchange failed:', await tokenResponse.text());
                    return c.json({ success: false, error: 'Token exchange failed' }, 400);
                }

                const tokenData = await tokenResponse.json() as GoogleTokenResponse;

                // Get user info
                const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                    headers: {
                        'Authorization': `Bearer ${tokenData.access_token}`,
                    },
                });

                if (!userResponse.ok) {
                    console.error('User info fetch failed:', await userResponse.text());
                    return c.json({ success: false, error: 'Failed to get user info' }, 400);
                }

                const userData = await userResponse.json() as GoogleUserInfo;

                // Store connection data in session token (simpler approach)
                console.log('Storing connection data in session token for user:', userData.id);

                // Create a session token with connection data included
                const connectionId = `${userData.id}_${userData.email}`;
                const sessionToken = btoa(JSON.stringify({
                    userId: userData.id,
                    email: userData.email,
                    name: userData.name,
                    picture: userData.picture,
                    access_token: tokenData.access_token,
                    refresh_token: tokenData.refresh_token,
                    connectionId: connectionId,
                    providerId: 'google',
                    scope: tokenData.scope,
                    expiresAt: Date.now() + (tokenData.expires_in * 1000),
                    exp: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
                }));

                const response = c.json({
                    success: true,
                    user: {
                        id: userData.id,
                        email: userData.email,
                        name: userData.name,
                        picture: userData.picture,
                    },
                    access_token: tokenData.access_token,
                    refresh_token: tokenData.refresh_token,
                });

                // For cross-domain setup, we need to set the cookie on the frontend domain
                // The session token is returned in the response and will be set by the frontend
                // No server-side cookie setting here since it won't be accessible to the frontend

                return response;

            } catch (error) {
                console.error('OAuth code exchange error:', error);
                return c.json({ success: false, error: 'Code exchange failed' }, 500);
            }
        })
        .get('/api/public/providers', async (c) => {
            // Return available authentication providers
            return c.json({
                providers: [
                    {
                        id: 'google',
                        name: 'Google',
                        type: 'oauth',
                        style: {
                            backgroundColor: '#4285f4',
                            color: '#ffffff',
                        },
                    },
                ],
            });
        })
        .post('/api/auth/sign-out', async (c) => {
            // Handle sign out by clearing session cookie
            const response = c.json({ success: true });
            response.headers.set('Set-Cookie', 'session=; Path=/; HttpOnly; Max-Age=0');
            return response;
        })
        .get('/api/trpc/test', (c) => c.json({ message: 'tRPC endpoint is working!' }))
        .get('/api/test-durable-objects', async (c) => {
            // Test Durable Objects functionality
            try {
                const testUserId = 'test-user-123';
                const db = await getZeroDB(testUserId);

                // Test creating a user
                await db.createUser({
                    id: testUserId,
                    email: 'test@example.com',
                    name: 'Test User',
                    picture: 'https://example.com/avatar.jpg',
                    emailVerified: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });

                // Test finding the user
                const user = await db.findUser();

                return c.json({
                    success: true,
                    message: 'Durable Objects are working!',
                    user: user ? { id: user.id, email: user.email, name: user.name } : null
                });
            } catch (error) {
                console.error('Durable Objects test error:', error);
                return c.json({
                    success: false,
                    message: 'Durable Objects test failed',
                    error: error instanceof Error ? error.message : 'Unknown error'
                }, 500);
            }
        })
        .get('/api/test-connection/:userId', async (c) => {
            // Test connection retrieval for a specific user
            try {
                const userId = c.req.param('userId');
                console.log('Testing connection for user:', userId);

                const db = await getZeroDB(userId);
                const user = await db.findUser();
                const connections = await db.findManyConnections();

                return c.json({
                    success: true,
                    user: user ? { id: user.id, email: user.email, name: user.name, defaultConnectionId: user.defaultConnectionId } : null,
                    connections: connections.map(c => ({ id: c.id, email: c.email, name: c.name, providerId: c.providerId })),
                    connectionCount: connections.length
                });
            } catch (error) {
                console.error('Connection test error:', error);
                return c.json({
                    success: false,
                    message: 'Connection test failed',
                    error: error instanceof Error ? error.message : 'Unknown error'
                }, 500);
            }
        })
        .use(
            '/api/trpc/*',
            trpcServer({
                endpoint: '/api/trpc',
                router: appRouter,
                createContext: (opts, c) => ({
                    c,
                    sessionUser: c.var.sessionUser,
                    auth: c.var.auth,
                }),
            }),
        );

    async fetch(request: Request): Promise<Response> {
        return this.app.fetch(request);
    }
}

export { ZeroAgent, ZeroMCP, ZeroDB, ZeroDriver };
