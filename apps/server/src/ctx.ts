import type { env } from 'cloudflare:workers';
import type { Auth } from './lib/auth';

export type SessionUser = NonNullable<Awaited<ReturnType<Auth['api']['getSession']>>>['user'];

export type HonoVariables = {
  auth: Auth;
  sessionUser?: SessionUser;
};

export type HonoContext = { Variables: HonoVariables; Bindings: typeof env };
