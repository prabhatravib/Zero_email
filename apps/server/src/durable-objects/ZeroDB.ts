export class ZeroDB {
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

        if (path === '/store-exchange' && request.method === 'POST') {
            // Store exchange token mapping
            const body = await request.json() as { exchangeToken: string; sessionId: string; expiresAt: number };
            const { exchangeToken, sessionId, expiresAt } = body;
            if (!exchangeToken || !sessionId) {
                return new Response('Exchange token and session ID required', { status: 400 });
            }
            
            // Store exchange token mapping
            await this.state.storage.put(`exchange_${exchangeToken}`, { sessionId, expiresAt });
            
            return new Response(JSON.stringify({ success: true }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (path === '/exchange' && request.method === 'POST') {
            // Exchange token for session ID
            const body = await request.json() as { exchangeToken: string };
            const { exchangeToken } = body;
            if (!exchangeToken) {
                return new Response('Exchange token required', { status: 400 });
            }
            
            // Get exchange token mapping
            const exchangeData = await this.state.storage.get(`exchange_${exchangeToken}`);
            if (!exchangeData) {
                return new Response('Exchange token not found', { status: 404 });
            }
            
            // Check if expired
            if (exchangeData.expiresAt && Date.now() > exchangeData.expiresAt) {
                // Clean up expired token
                await this.state.storage.delete(`exchange_${exchangeToken}`);
                return new Response('Exchange token expired', { status: 410 });
            }
            
            // Get session data
            const sessionData = await this.state.storage.get(exchangeData.sessionId);
            if (!sessionData) {
                return new Response('Session not found', { status: 404 });
            }
            
            // Clean up exchange token (one-time use)
            await this.state.storage.delete(`exchange_${exchangeToken}`);
            
            return new Response(JSON.stringify({ sessionId: exchangeData.sessionId, sessionData }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response('Not found', { status: 404 });
    }
} 