import type { User } from 'better-auth';
import type { HonoContext as BaseHonoContext } from 'hono';
import type { Session } from 'better-auth';
import type { DB } from './db';

export type HonoContext = BaseHonoContext<{
  Variables: {
    sessionUser: User | undefined;
    auth: any;
    db: DB | undefined;
  };
  Bindings: any;
}>;
