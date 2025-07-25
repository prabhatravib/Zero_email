import { env } from 'cloudflare:workers';
import { Redis } from '@upstash/redis';
import { Resend } from 'resend';

export const resend = () =>
  env.RESEND_API_KEY
    ? new Resend(env.RESEND_API_KEY)
    : { emails: { send: async (...args: unknown[]) => console.log(args) } };

export const redis = () => {
  // Redis disabled - no Redis storage
  return {
    get: async () => null,
    set: async () => null,
    del: async () => null,
  };
};
