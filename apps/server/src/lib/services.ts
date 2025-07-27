import { env } from 'cloudflare:workers';
import { Resend } from 'resend';

export const resend = () =>
  env.RESEND_API_KEY
    ? new Resend(env.RESEND_API_KEY)
    : { emails: { send: async (...args: unknown[]) => console.log(args) } };

export const redis = () => {
  // Mock Redis - allows all requests (no rate limiting)
  return {
    get: async () => null,
    set: async () => null,
    del: async () => null,
    eval: async () => [1, 0, 0], // [success, limit, remaining]
    evalsha: async () => [1, 0, 0], // Add missing evalsha method
  };
};
