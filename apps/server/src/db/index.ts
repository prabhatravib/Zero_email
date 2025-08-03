import { drizzle } from 'drizzle-orm/d1';
import { drizzle as drizzleHyperdrive } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from 'cloudflare:workers';
import * as schema from './schema-d1';

export const createDb = (connectionString?: string) => {
  if (connectionString) {
    const client = postgres(connectionString);
    return {
      db: drizzleHyperdrive(client, { schema }),
      conn: client,
    };
  }
  
  // Use D1 database from environment
  const d1 = env.DB;
  if (!d1) {
    throw new Error('D1 database binding not found. Make sure DB is configured in wrangler.jsonc');
  }
  
  return {
    db: drizzle(d1, { schema }),
    conn: null,
  };
};

export type DB = ReturnType<typeof drizzle<typeof schema>>;
