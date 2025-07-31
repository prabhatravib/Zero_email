import { env } from 'cloudflare:workers';
import { Redis } from '@upstash/redis';
import { Resend } from 'resend';

export const resend = () =>
  env.RESEND_API_KEY
    ? new Resend(env.RESEND_API_KEY)
    : { emails: { send: async (...args: unknown[]) => console.log(args) } };

export const redis = () => {
  // If Redis is not configured, use a simple in-memory fallback
  if (!env.REDIS_URL || !env.REDIS_TOKEN) {
    console.warn('[Upstash Redis] The Redis config is missing, using fallback');
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
        return memoryStore.get(keys[0]) || null;
      },
    };
  }
  
  try {
    const redisInstance = new Redis({ url: env.REDIS_URL, token: env.REDIS_TOKEN });
    
    // Add evalsha method if it doesn't exist
    if (!redisInstance.evalsha) {
      redisInstance.evalsha = async (script: string, keys: string[], args: string[]) => {
        // Fallback implementation for evalsha
        console.warn('[Redis] evalsha not available, using fallback');
        return redisInstance.get(keys[0]) || null;
      };
    }
    
    return redisInstance;
  } catch (error) {
    console.error('[Redis] Failed to initialize Redis:', error);
    // Return fallback
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
        return memoryStore.get(keys[0]) || null;
      },
    };
  }
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
