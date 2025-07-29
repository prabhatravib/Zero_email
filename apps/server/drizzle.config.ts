import { type Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'file:./local.db',
  },
  out: './src/db/migrations',
  tablesFilter: ['mail0_*'],
  driver: 'd1',
} satisfies Config;
