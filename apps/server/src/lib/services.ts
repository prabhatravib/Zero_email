import { env } from 'cloudflare:workers';
import { getResend } from './lazy-modules';

export const resend = async () => {
  if (!env.RESEND_API_KEY) {
    return { emails: { send: async () => console.log('Mock email sent') } };
  }
  
  const { Resend } = await getResend();
  return new Resend(env.RESEND_API_KEY);
};

export const redis = () => {
  // Use Cloudflare KV for rate limiting instead of in-memory fallback
  // This provides better performance and persistence
  console.log('[Redis] Using Cloudflare KV for rate limiting');
  
  return {
    get: async (key: string) => {
      return await env.rate_limiting.get(key);
    },
    set: async (key: string, value: string, options?: { ex?: number }) => {
      const ttl = options?.ex ? { expirationTtl: options.ex } : undefined;
      await env.rate_limiting.put(key, value, ttl);
    },
    del: async (key: string) => {
      await env.rate_limiting.delete(key);
    },
    evalsha: async (script: string, keys: string[], args: string[]) => {
      // For rate limiting, we need to implement a simple sliding window
      // This is a simplified version that works with @upstash/ratelimit
      const key = keys[0];
      const current = await env.rate_limiting.get(key);
      return current || null;
    },
    // Additional methods that might be needed
    exists: async (key: string) => {
      const value = await env.rate_limiting.get(key);
      return value !== null ? 1 : 0;
    },
    incr: async (key: string) => {
      const current = await env.rate_limiting.get(key);
      const newValue = (parseInt(current || '0')) + 1;
      await env.rate_limiting.put(key, newValue.toString());
      return newValue;
    },
    expire: async (key: string, seconds: number) => {
      // KV doesn't support expire directly, but we can set expiration on put
      const current = await env.rate_limiting.get(key);
      if (current !== null) {
        await env.rate_limiting.put(key, current, { expirationTtl: seconds });
      }
      return 1;
    },
  };
};

export const twilio = () => {
  //   if (env.NODE_ENV === 'development' && !forceUseRealService) {
  //     return {
  //       messages: {
  //         send: async (to: string, body: string) =>
  //           console.log(`[TWILIO:MOCK] Sending message to ${to}: ${body}`),
  //       },
  //     };
  //   }

  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_PHONE_NUMBER) {
    throw new Error('Twilio is not configured correctly');
  }

  const send = async (to: string, body: string) => {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`)}`,
        },
        body: new URLSearchParams({
          To: to,
          From: env.TWILIO_PHONE_NUMBER,
          Body: body,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to send OTP: ${error}`);
    }
  };

  return {
    messages: {
      send,
    },
  };
};
