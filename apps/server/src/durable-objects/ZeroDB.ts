import { DurableObject, RpcTarget } from 'cloudflare:workers';
import { env } from 'cloudflare:workers';
import {
  account,
  connection,
  note,
  session,
  user,
  userHotkeys,
  userSettings,
  writingStyleMatrix,
} from '../db/schema';
import { createDb } from '../db';
import { eq, and, desc, asc, inArray } from 'drizzle-orm';
import { EProviders } from '../types';
import { defaultUserSettings } from '../lib/schemas';

export class ZeroDB extends DurableObject<Env> {
  private db: D1Database | null = null;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    
    // Initialize D1 database if available
    if (env.DB) {
      this.db = env.DB;
      console.log('[ZeroDB] D1 database initialized');
    } else {
      console.log('[ZeroDB] D1 database not available, using fallback storage');
    }
  }

  async setMetaData(userId: string) {
    return new DbRpcDO(this, userId);
  }

  private async createTables() {
    if (!this.db) return;
    
    try {
      // Create tables if they don't exist
      await this.db.prepare(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          name TEXT,
          image TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      await this.db.prepare(`
        CREATE TABLE IF NOT EXISTS connections (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          providerId TEXT NOT NULL,
          email TEXT NOT NULL,
          accessToken TEXT,
          refreshToken TEXT,
          expiresAt DATETIME,
          scope TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id)
        )
      `).run();

      await this.db.prepare(`
        CREATE TABLE IF NOT EXISTS threads (
          id TEXT PRIMARY KEY,
          connectionId TEXT NOT NULL,
          threadId TEXT NOT NULL,
          data TEXT NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      await this.db.prepare(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          data TEXT NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id)
        )
      `).run();

      console.log('[ZeroDB] Tables created successfully');
    } catch (error) {
      console.error('[ZeroDB] Error creating tables:', error);
    }
  }

  private async sql(query: string, params: any[] = []) {
    if (!this.db) {
      throw new Error('D1 database not available');
    }
    
    const stmt = this.db.prepare(query);
    return stmt.bind(...params);
  }

  async findUser(userId: string) {
    if (!this.db) {
      // Fallback to Hyperdrive
      const { db } = createDb(env.HYPERDRIVE.connectionString);
      return await db.query.user.findFirst({
        where: eq(user.id, userId),
      });
    }

    const result = await this.sql('SELECT * FROM users WHERE id = ?', [userId]);
    const userData = await result.first();
    return userData || undefined;
  }

  async findUserConnection(userId: string, connectionId: string) {
    if (!this.db) {
      // Fallback to Hyperdrive
      const { db } = createDb(env.HYPERDRIVE.connectionString);
      return await db.query.connection.findFirst({
        where: and(eq(connection.id, connectionId), eq(connection.userId, userId)),
      });
    }

    const result = await this.sql(
      'SELECT * FROM connections WHERE id = ? AND userId = ?',
      [connectionId, userId]
    );
    const connectionData = await result.first();
    return connectionData || undefined;
  }

  async updateUser(userId: string, data: Partial<typeof user.$inferInsert>) {
    if (!this.db) {
      // Fallback to Hyperdrive
      const { db } = createDb(env.HYPERDRIVE.connectionString);
      return await db
        .update(user)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(user.id, userId));
    }

    const fields = Object.keys(data).filter(key => key !== 'id');
    const values = Object.values(data).filter(value => value !== undefined);
    
    if (fields.length === 0) return;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const query = `UPDATE users SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
    
    await this.sql(query, [...values, userId]);
  }

  async deleteConnection(connectionId: string, userId: string) {
    if (!this.db) {
      // Fallback to Hyperdrive
      const { db } = createDb(env.HYPERDRIVE.connectionString);
      return await db
        .delete(connection)
        .where(and(eq(connection.id, connectionId), eq(connection.userId, userId)));
    }

    await this.sql(
      'DELETE FROM connections WHERE id = ? AND userId = ?',
      [connectionId, userId]
    );
  }

  async findFirstConnection(userId: string) {
    if (!this.db) {
      // Fallback to Hyperdrive
      const { db } = createDb(env.HYPERDRIVE.connectionString);
      return await db.query.connection.findFirst({
        where: eq(connection.userId, userId),
      });
    }

    const result = await this.sql(
      'SELECT * FROM connections WHERE userId = ? ORDER BY createdAt ASC LIMIT 1',
      [userId]
    );
    const connectionData = await result.first();
    return connectionData || undefined;
  }

  async findManyConnections(userId: string) {
    if (!this.db) {
      // Fallback to Hyperdrive
      const { db } = createDb(env.HYPERDRIVE.connectionString);
      return await db.query.connection.findMany({
        where: eq(connection.userId, userId),
      });
    }

    const result = await this.sql(
      'SELECT * FROM connections WHERE userId = ? ORDER BY createdAt ASC',
      [userId]
    );
    return await result.all();
  }

  async createConnection(
    providerId: EProviders,
    email: string,
    userId: string,
    updatingInfo: {
      expiresAt: Date;
      scope: string;
    },
  ) {
    if (!this.db) {
      // Fallback to Hyperdrive
      const { db } = createDb(env.HYPERDRIVE.connectionString);
      return await db
        .insert(connection)
        .values({
          ...updatingInfo,
          providerId,
          id: crypto.randomUUID(),
          email,
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [connection.email, connection.userId],
          set: {
            ...updatingInfo,
            updatedAt: new Date(),
          },
        });
    }

    const connectionId = crypto.randomUUID();
    await this.sql(
      `INSERT OR REPLACE INTO connections 
       (id, userId, providerId, email, accessToken, refreshToken, expiresAt, scope, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        connectionId,
        userId,
        providerId,
        email,
        updatingInfo.accessToken || null,
        updatingInfo.refreshToken || null,
        updatingInfo.expiresAt.toISOString(),
        updatingInfo.scope,
      ]
    );

    return [{ id: connectionId }];
  }

  async updateConnection(
    connectionId: string,
    updatingInfo: Partial<typeof connection.$inferInsert>,
  ) {
    if (!this.db) {
      // Fallback to Hyperdrive
      const { db } = createDb(env.HYPERDRIVE.connectionString);
      return await db
        .update(connection)
        .set(updatingInfo)
        .where(eq(connection.id, connectionId));
    }

    const fields = Object.keys(updatingInfo).filter(key => key !== 'id');
    const values = Object.values(updatingInfo).filter(value => value !== undefined);
    
    if (fields.length === 0) return;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const query = `UPDATE connections SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
    
    await this.sql(query, [...values, connectionId]);
  }

  // Thread operations
  async storeThread(connectionId: string, threadId: string, data: any) {
    if (!this.db) {
      // Fallback to storage
      await this.state.storage.put(`thread:${connectionId}:${threadId}`, data);
      return;
    }

    await this.sql(
      `INSERT OR REPLACE INTO threads (id, connectionId, threadId, data, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [crypto.randomUUID(), connectionId, threadId, JSON.stringify(data)]
    );
  }

  async getThread(connectionId: string, threadId: string) {
    if (!this.db) {
      // Fallback to storage
      return await this.state.storage.get(`thread:${connectionId}:${threadId}`);
    }

    const result = await this.sql(
      'SELECT data FROM threads WHERE connectionId = ? AND threadId = ?',
      [connectionId, threadId]
    );
    const threadData = await result.first();
    return threadData ? JSON.parse(threadData.data) : null;
  }

  async getThreads(connectionId: string, limit = 50, offset = 0) {
    if (!this.db) {
      // Fallback to storage
      const keys = await this.state.storage.list({ prefix: `thread:${connectionId}:` });
      const threads = [];
      for (const [key, value] of keys.entries()) {
        threads.push(value);
      }
      return threads.slice(offset, offset + limit);
    }

    const result = await this.sql(
      'SELECT data FROM threads WHERE connectionId = ? ORDER BY updatedAt DESC LIMIT ? OFFSET ?',
      [connectionId, limit, offset]
    );
    const threads = await result.all();
    return threads.map(thread => JSON.parse(thread.data));
  }

  async deleteThread(connectionId: string, threadId: string) {
    if (!this.db) {
      // Fallback to storage
      await this.state.storage.delete(`thread:${connectionId}:${threadId}`);
      return;
    }

    await this.sql(
      'DELETE FROM threads WHERE connectionId = ? AND threadId = ?',
      [connectionId, threadId]
    );
  }

  async getThreadCount(connectionId: string) {
    if (!this.db) {
      // Fallback to storage
      const keys = await this.state.storage.list({ prefix: `thread:${connectionId}:` });
      return keys.size;
    }

    const result = await this.sql(
      'SELECT COUNT(*) as count FROM threads WHERE connectionId = ?',
      [connectionId]
    );
    const countData = await result.first();
    return countData ? countData.count : 0;
  }

  async getFolderThreadCount(connectionId: string, folder: string) {
    if (!this.db) {
      // Fallback to storage
      const keys = await this.state.storage.list({ prefix: `thread:${connectionId}:` });
      let count = 0;
      for (const [key, value] of keys.entries()) {
        const thread = value;
        if (thread.folder === folder) {
          count++;
        }
      }
      return count;
    }

    const result = await this.sql(
      'SELECT COUNT(*) as count FROM threads WHERE connectionId = ? AND json_extract(data, "$.folder") = ?',
      [connectionId, folder]
    );
    const countData = await result.first();
    return countData ? countData.count : 0;
  }
}

export class DbRpcDO extends RpcTarget {
  constructor(
    private mainDo: ZeroDB,
    private userId: string,
  ) {
    super();
  }

  async findUser(): Promise<typeof user.$inferSelect | undefined> {
    return await this.mainDo.findUser(this.userId);
  }

  async findUserConnection(
    connectionId: string,
  ): Promise<typeof connection.$inferSelect | undefined> {
    return await this.mainDo.findUserConnection(this.userId, connectionId);
  }

  async updateUser(data: Partial<typeof user.$inferInsert>) {
    return await this.mainDo.updateUser(this.userId, data);
  }

  async deleteConnection(connectionId: string) {
    return await this.mainDo.deleteConnection(connectionId, this.userId);
  }

  async findFirstConnection(): Promise<typeof connection.$inferSelect | undefined> {
    return await this.mainDo.findFirstConnection(this.userId);
  }

  async findManyConnections(): Promise<(typeof connection.$inferSelect)[]> {
    return await this.mainDo.findManyConnections(this.userId);
  }

  async createConnection(
    providerId: EProviders,
    email: string,
    updatingInfo: {
      expiresAt: Date;
      scope: string;
    },
  ): Promise<{ id: string }[]> {
    return await this.mainDo.createConnection(providerId, email, this.userId, updatingInfo);
  }

  async updateConnection(
    connectionId: string,
    updatingInfo: Partial<typeof connection.$inferInsert>,
  ) {
    return await this.mainDo.updateConnection(connectionId, updatingInfo);
  }

  // Thread operations
  async storeThread(connectionId: string, threadId: string, data: any) {
    return await this.mainDo.storeThread(connectionId, threadId, data);
  }

  async getThread(connectionId: string, threadId: string) {
    return await this.mainDo.getThread(connectionId, threadId);
  }

  async getThreads(connectionId: string, limit = 50, offset = 0) {
    return await this.mainDo.getThreads(connectionId, limit, offset);
  }

  async deleteThread(connectionId: string, threadId: string) {
    return await this.mainDo.deleteThread(connectionId, threadId);
  }

  async getThreadCount(connectionId: string) {
    return await this.mainDo.getThreadCount(connectionId);
  }

  async getFolderThreadCount(connectionId: string, folder: string) {
    return await this.mainDo.getFolderThreadCount(connectionId, folder);
  }
} 