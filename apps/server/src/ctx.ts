import type { env } from 'cloudflare:workers';

export type SessionUser = {
  id: string;
  email: string;
  name?: string;
  image?: string;
  emailVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type HonoVariables = {
  sessionUser?: SessionUser;
};

export type HonoContext = { Variables: HonoVariables; Bindings: typeof env };
