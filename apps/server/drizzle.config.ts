import { type Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema-d1.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: 'file:./dev.db',
  },
  out: './src/db/migrations',
  tablesFilter: ['mail0_*'],
} satisfies Config;
