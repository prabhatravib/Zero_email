import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

const createDrizzle = (db: D1Database) => drizzle(db, { schema });

export const createDb = (db: D1Database) => {
  const drizzleDb = createDrizzle(db);
  return { db: drizzleDb, conn: db };
};

export type DB = ReturnType<typeof createDrizzle>;
