import { DurableObject } from "cloudflare:workers";

export class ZeroDB extends DurableObject {
    private state: DurableObjectState;
    private env: any;
    private sessions: Map<string, any>;
    private db: D1Database | null = null;

    constructor(state: DurableObjectState, env: any) {
        super(state, env);
        this.state = state;
        this.env = env;
        this.sessions = new Map();
        this.initializeDatabase();
    }

    private async initializeDatabase() {
        try {
            // Initialize SQLite database if available
            if (this.env.DB) {
                this.db = this.env.DB;
                await this.createTables();
            } else {
                console.log('No D1 database binding found, using storage fallback');
            }
        } catch (error) {
            console.error('Failed to initialize database:', error);
        }
    }

    private async createTables() {
        if (!this.db) return;

        try {
            // Create threads table
            await this.db.prepare(`
                CREATE TABLE IF NOT EXISTS threads (
                    id TEXT PRIMARY KEY,
                    thread_id TEXT NOT NULL,
                    provider_id TEXT NOT NULL DEFAULT 'google',
                    latest_sender TEXT,
                    latest_received_on TEXT,
                    latest_subject TEXT,
                    latest_label_ids TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `).run();

            // Create sessions table
            await this.db.prepare(`
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    session_data TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `).run();

            // Create connections table
            await this.db.prepare(`
                CREATE TABLE IF NOT EXISTS connections (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    email TEXT NOT NULL,
                    name TEXT,
                    picture TEXT,
                    access_token TEXT,
                    refresh_token TEXT,
                    scope TEXT NOT NULL,
                    provider_id TEXT NOT NULL,
                    expires_at DATETIME NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `).run();

            // Create indexes
            await this.db.prepare('CREATE INDEX IF NOT EXISTS idx_threads_thread_id ON threads(thread_id)').run();
            await this.db.prepare('CREATE INDEX IF NOT EXISTS idx_threads_provider_id ON threads(provider_id)').run();
            await this.db.prepare('CREATE INDEX IF NOT EXISTS idx_threads_latest_received_on ON threads(latest_received_on)').run();
            await this.db.prepare('CREATE INDEX IF NOT EXISTS idx_connections_user_id ON connections(user_id)').run();
            await this.db.prepare('CREATE INDEX IF NOT EXISTS idx_connections_email ON connections(email)').run();
            await this.db.prepare('CREATE INDEX IF NOT EXISTS idx_connections_provider_id ON connections(provider_id)').run();

            console.log('Database tables created successfully');
        } catch (error) {
            console.error('Failed to create database tables:', error);
        }
    }

    // SQLite query helper
    private async sql(strings: TemplateStringsArray, ...values: any[]) {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        const query = strings.reduce((result, str, i) => {
            return result + str + (values[i] !== undefined ? '?' : '');
        }, '');

        const stmt = this.db.prepare(query);
        return stmt.bind(...values);
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
            
            if (this.db) {
                // Store in SQLite database
                await this.sql`INSERT OR REPLACE INTO sessions (id, session_data, updated_at) VALUES (${sessionId}, ${JSON.stringify(sessionData)}, CURRENT_TIMESTAMP)`;
            } else {
                // Fallback to storage
                await this.state.storage.put(sessionId, sessionData);
            }
            
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
            
            let sessionData;
            if (this.db) {
                // Get from SQLite database
                const result = await this.sql`SELECT session_data FROM sessions WHERE id = ${sessionId}`;
                sessionData = result.first?.session_data ? JSON.parse(result.first.session_data) : null;
            } else {
                // Fallback to storage
                sessionData = await this.state.storage.get(sessionId);
            }
            
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
            let sessionData;
            if (this.db) {
                const result = await this.sql`SELECT session_data FROM sessions WHERE id = ${exchangeData.sessionId}`;
                sessionData = result.first?.session_data ? JSON.parse(result.first.session_data) : null;
            } else {
                sessionData = await this.state.storage.get(exchangeData.sessionId);
            }
            
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

    // RPC methods for connections
    async findManyConnections() {
        if (this.db) {
            const result = await this.sql`SELECT * FROM connections`;
            return result.all || [];
        } else {
            // Fallback to storage
            const connections = await this.state.storage.get('connections') || [];
            return connections;
        }
    }

    async findUserConnection(connectionId: string) {
        if (this.db) {
            const result = await this.sql`SELECT * FROM connections WHERE id = ${connectionId}`;
            return result.first || null;
        } else {
            // Fallback to storage
            const connections = await this.state.storage.get('connections') || [];
            return connections.find((c: any) => c.id === connectionId) || null;
        }
    }

    async updateUser(userData: any) {
        if (this.db) {
            await this.sql`INSERT OR REPLACE INTO connections (id, user_id, email, name, picture, access_token, refresh_token, scope, provider_id, expires_at, updated_at) VALUES (${userData.id}, ${userData.user_id}, ${userData.email}, ${userData.name}, ${userData.picture}, ${userData.access_token}, ${userData.refresh_token}, ${userData.scope}, ${userData.provider_id}, ${userData.expires_at}, CURRENT_TIMESTAMP)`;
        } else {
            // Fallback to storage
            await this.state.storage.put('user', userData);
        }
        return { success: true };
    }

    async deleteConnection(connectionId: string) {
        if (this.db) {
            await this.sql`DELETE FROM connections WHERE id = ${connectionId}`;
        } else {
            // Fallback to storage
            const connections = await this.state.storage.get('connections') || [];
            const filteredConnections = connections.filter((c: any) => c.id !== connectionId);
            await this.state.storage.put('connections', filteredConnections);
        }
        return { success: true };
    }

    async storeConnection(connection: any) {
        if (this.db) {
            await this.sql`INSERT OR REPLACE INTO connections (id, user_id, email, name, picture, access_token, refresh_token, scope, provider_id, expires_at, created_at, updated_at) VALUES (${connection.id}, ${connection.user_id}, ${connection.email}, ${connection.name}, ${connection.picture}, ${connection.access_token}, ${connection.refresh_token}, ${connection.scope}, ${connection.provider_id}, ${connection.expires_at}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
        } else {
            // Fallback to storage
            const connections = await this.state.storage.get('connections') || [];
            connections.push(connection);
            await this.state.storage.put('connections', connections);
        }
        return { success: true };
    }

    // Thread operations
    async storeThread(threadData: any) {
        if (this.db) {
            await this.sql`INSERT OR REPLACE INTO threads (id, thread_id, provider_id, latest_sender, latest_received_on, latest_subject, latest_label_ids, updated_at) VALUES (${threadData.id}, ${threadData.thread_id}, ${threadData.provider_id}, ${JSON.stringify(threadData.latest_sender)}, ${threadData.latest_received_on}, ${threadData.latest_subject}, ${JSON.stringify(threadData.latest_label_ids)}, CURRENT_TIMESTAMP)`;
        }
        return { success: true };
    }

    async getThread(threadId: string) {
        if (this.db) {
            const result = await this.sql`SELECT * FROM threads WHERE id = ${threadId}`;
            return result.first || null;
        }
        return null;
    }

    async getThreads(folder?: string, maxResults: number = 50, pageToken?: string) {
        if (this.db) {
            let query = `SELECT * FROM threads`;
            const conditions = [];
            const params = [];

            if (folder) {
                conditions.push(`EXISTS (SELECT 1 FROM json_each(latest_label_ids) WHERE value = ?)`);
                params.push(folder.toUpperCase());
            }

            if (pageToken) {
                conditions.push(`latest_received_on < ?`);
                params.push(pageToken);
            }

            if (conditions.length > 0) {
                query += ` WHERE ${conditions.join(' AND ')}`;
            }

            query += ` ORDER BY latest_received_on DESC LIMIT ?`;
            params.push(maxResults);

            const stmt = this.db.prepare(query);
            const result = stmt.bind(...params);
            return result.all || [];
        }
        return [];
    }

    async deleteThread(threadId: string) {
        if (this.db) {
            await this.sql`DELETE FROM threads WHERE id = ${threadId}`;
        }
        return { success: true };
    }

    async getThreadCount() {
        if (this.db) {
            const result = await this.sql`SELECT COUNT(*) as count FROM threads`;
            return result.first?.count || 0;
        }
        return 0;
    }

    async getFolderThreadCount(folder: string) {
        if (this.db) {
            const result = await this.sql`SELECT COUNT(*) as count FROM threads WHERE EXISTS (SELECT 1 FROM json_each(latest_label_ids) WHERE value = ${folder.toUpperCase()})`;
            return result.first?.count || 0;
        }
        return 0;
    }
} 