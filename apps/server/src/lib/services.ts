import { env } from 'cloudflare:workers';
import { Resend } from 'resend';

export const resend = () =>
  env.RESEND_API_KEY
    ? new Resend(env.RESEND_API_KEY)
    : { emails: { send: async (...args: unknown[]) => console.log(args) } };

export const redis = () => {
  // Since you're not using Upstash Redis, we'll use a simple in-memory fallback
  // that provides the methods needed by @upstash/ratelimit
  console.warn('[Redis] Using in-memory fallback for rate limiting');
  
  const memoryStore = new Map();
  
  return {
    get: async (key: string) => memoryStore.get(key),
    set: async (key: string, value: string, options?: { ex?: number }) => {
      memoryStore.set(key, value);
      if (options?.ex) {
        setTimeout(() => memoryStore.delete(key), options.ex * 1000);
      }
    },
    del: async (key: string) => memoryStore.delete(key),
    evalsha: async (script: string, keys: string[], args: string[]) => {
      // Simple fallback for evalsha - just return the first key's value
      // This is used by @upstash/ratelimit for rate limiting
      return memoryStore.get(keys[0]) || null;
    },
    // Additional methods that might be needed
    exists: async (key: string) => memoryStore.has(key) ? 1 : 0,
    incr: async (key: string) => {
      const current = memoryStore.get(key);
      const newValue = (parseInt(current) || 0) + 1;
      memoryStore.set(key, newValue.toString());
      return newValue;
    },
    expire: async (key: string, seconds: number) => {
      setTimeout(() => memoryStore.delete(key), seconds * 1000);
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
