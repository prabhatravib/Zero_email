import {
  AIWritingAssistantEmail,
  AutoLabelingEmail,
  CategoriesEmail,
  Mail0ProEmail,
  ShortcutsEmail,
  SuperSearchEmail,
  WelcomeEmail,
} from './react-emails/email-sequences';
import { createAuthMiddleware, jwt, bearer, mcp } from 'better-auth/plugins';
import { type Account, betterAuth, type BetterAuthOptions } from 'better-auth';
import { getBrowserTimezone, isValidTimezone } from './timezones';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getSocialProviders } from './auth-providers';
import { redis, resend } from './services';
import { getContext } from 'hono/context-storage';
import { dubAnalytics } from '@dub/better-auth';
import { defaultUserSettings } from './schemas';
import { disableBrainFunction, enableBrainFunction } from './brain';
import { APIError } from 'better-auth/api';
import { getZeroDB } from './server-utils';
import { type EProviders } from '../types';
import type { HonoContext } from '../ctx';
import { env } from 'cloudflare:workers';
import { createDriver } from './driver';
import { createDb } from '../db';
import { Effect } from 'effect';
import { Dub } from 'dub';

const scheduleCampaign = (userInfo: { address: string; name: string }) =>
  Effect.gen(function* () {
    const name = userInfo.name || 'there';
    const resendService = resend();

    const sendEmail = (subject: string, react: unknown, scheduledAt?: string) =>
      Effect.promise(() =>
        resendService.emails
          .send({
            from: '0.email <onboarding@0.email>',
            to: userInfo.address,
            subject,
            react: react as any,
            ...(scheduledAt && { scheduledAt }),
          })
          .then(() => void 0),
      );

    const emails = [
      {
        subject: 'Welcome to 0.email',
        react: WelcomeEmail({ name }),
        scheduledAt: undefined,
      },
      {
        subject: 'Mail0 Pro is here 🚀💼',
        react: Mail0ProEmail({ name }),
        scheduledAt: 'in 1 day',
      },
      {
        subject: 'Auto-labeling is here 🎉📥',
        react: AutoLabelingEmail({ name }),
        scheduledAt: 'in 2 days',
      },
      {
        subject: 'AI Writing Assistant is here 🤖💬',
        react: AIWritingAssistantEmail({ name }),
        scheduledAt: 'in 3 days',
      },
      {
        subject: 'Shortcuts are here 🔧🚀',
        react: ShortcutsEmail({ name }),
        scheduledAt: 'in 4 days',
      },
      {
        subject: 'Categories are here 📂🔍',
        react: CategoriesEmail({ name }),
        scheduledAt: 'in 5 days',
      },
      {
        subject: 'Super Search is here 🔍🚀',
        react: SuperSearchEmail({ name }),
        scheduledAt: 'in 6 days',
      },
    ];

    yield* Effect.all(
      emails.map((email) => sendEmail(email.subject, email.react, email.scheduledAt)),
      { concurrency: 'unbounded' },
    );
  });

const connectionHandlerHook = async (account: Account) => {
  console.log('Connection handler hook called with account:', {
    providerId: account.providerId,
    userId: account.userId,
    hasAccessToken: !!account.accessToken,
    hasRefreshToken: !!account.refreshToken,
    accessTokenExpiresAt: account.accessTokenExpiresAt,
    scope: account.scope,
  });
  
  if (!account.accessToken || !account.refreshToken) {
    console.error('Missing Access/Refresh Tokens', { 
      account: {
        providerId: account.providerId,
        userId: account.userId,
        hasAccessToken: !!account.accessToken,
        hasRefreshToken: !!account.refreshToken,
        accessTokenExpiresAt: account.accessTokenExpiresAt,
        scope: account.scope,
      }
    });
    throw new APIError('EXPECTATION_FAILED', { message: 'Missing Access/Refresh Tokens' });
  }

  const driver = createDriver(account.providerId, {
    auth: {
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      userId: account.userId,
      email: '',
    },
  });

  const userInfo = await driver.getUserInfo().catch(() => {
    throw new APIError('UNAUTHORIZED', { message: 'Failed to get user info' });
  });

  if (!userInfo?.address) {
    console.error('Missing email in user info:', { userInfo });
    throw new APIError('BAD_REQUEST', { message: 'Missing "email" in user info' });
  }

  const updatingInfo = {
    name: userInfo.name || 'Unknown',
    picture: userInfo.photo || '',
    accessToken: account.accessToken,
    refreshToken: account.refreshToken,
    scope: driver.getScope(),
    expiresAt: new Date(Date.now() + (account.accessTokenExpiresAt?.getTime() || 3600000)),
  };

  const db = await getZeroDB(account.userId);
  const [result] = await db.createConnection(
    account.providerId as EProviders,
    userInfo.address,
    updatingInfo,
  );

  if (env.NODE_ENV === 'production') {
    await Effect.runPromise(
      scheduleCampaign({ address: userInfo.address, name: userInfo.name || 'there' }),
    );
  }

  if (env.GOOGLE_S_ACCOUNT && env.GOOGLE_S_ACCOUNT !== '{}') {
    // Direct processing instead of queue (for free plan)
    await enableBrainFunction({
      id: result.id,
      providerId: account.providerId as EProviders,
    });
  }
};

export const createAuth = () => {
  console.log('Creating auth configuration...');
  console.log('Environment variables:', {
    NODE_ENV: env.NODE_ENV,
    VITE_PUBLIC_BACKEND_URL: env.VITE_PUBLIC_BACKEND_URL,
    COOKIE_DOMAIN: env.COOKIE_DOMAIN,
    BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET ? 'SET' : 'NOT_SET',
    GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT_SET',
    GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT_SET',
  });
  
  // Initialize plugins without Dub analytics for now
  const plugins = [
    mcp({
      loginPage: env.VITE_PUBLIC_APP_URL + '/login',
    }),
    jwt(),
    bearer(),
  ];



  console.log('Creating better-auth instance...');
  return betterAuth({
    plugins,
    user: {
      deleteUser: {
        enabled: true,
        async sendDeleteAccountVerification(data) {
          const verificationUrl = data.url;

          await resend().emails.send({
            from: '0.email <no-reply@0.email>',
            to: data.user.email,
            subject: 'Delete your 0.email account',
            html: `
            <h2>Delete Your 0.email Account</h2>
            <p>Click the link below to delete your account:</p>
            <a href="${verificationUrl}">${verificationUrl}</a>
          `,
          });
        },
        beforeDelete: async (user, request) => {
          if (!request) throw new APIError('BAD_REQUEST', { message: 'Request object is missing' });
          const db = await getZeroDB(user.id);
          const connections = await db.findManyConnections();
          const context = getContext<HonoContext>();
          try {
            await context.var.autumn.customers.delete(user.id);
          } catch (error) {
            console.error('Failed to delete Autumn customer:', error);
            // Continue with deletion process despite Autumn failure
          }

          const revokedAccounts = (
            await Promise.allSettled(
              connections.map(async (connection) => {
                if (!connection.accessToken || !connection.refreshToken) return false;
                await disableBrainFunction({
                  id: connection.id,
                  providerId: connection.providerId as EProviders,
                });
                const driver = createDriver(connection.providerId, {
                  auth: {
                    accessToken: connection.accessToken,
                    refreshToken: connection.refreshToken,
                    userId: user.id,
                    email: connection.email,
                  },
                });
                const token = connection.refreshToken;
                return await driver.revokeToken(token || '');
              }),
            )
          ).map((result) => {
            if (result.status === 'fulfilled') {
              return result.value;
            }
            return false;
          });

          if (revokedAccounts.every((value) => !!value)) {
            console.log('Failed to revoke some accounts');
          }

          await db.deleteUser();
        },
      },
    },
    databaseHooks: {
      account: {
        create: {
          after: connectionHandlerHook,
        },
        update: {
          after: connectionHandlerHook,
        },
      },
    },
    emailAndPassword: {
      enabled: false,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        await resend().emails.send({
          from: '0.email <onboarding@0.email>',
          to: user.email,
          subject: 'Reset your password',
          html: `
            <h2>Reset Your Password</h2>
            <p>Click the link below to reset your password:</p>
            <a href="${url}">${url}</a>
            <p>If you didn't request this, you can safely ignore this email.</p>
          `,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: false,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, token }) => {
        const verificationUrl = `${env.VITE_PUBLIC_APP_URL}/api/auth/verify-email?token=${token}&callbackURL=/settings/connections`;

        await resend().emails.send({
          from: '0.email <onboarding@0.email>',
          to: user.email,
          subject: 'Verify your 0.email account',
          html: `
            <h2>Verify Your 0.email Account</h2>
            <p>Click the link below to verify your email:</p>
            <a href="${verificationUrl}">${verificationUrl}</a>
          `,
        });
      },
    },
    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        // all hooks that run on sign-up routes
        if (ctx.path.startsWith('/sign-up')) {
          // only true if this request is from a new user
          const newSession = ctx.context.newSession;
          if (newSession) {
            // Check if user already has settings
            const db = await getZeroDB(newSession.user.id);
            const existingSettings = await db.findUserSettings();

            if (!existingSettings) {
              // get timezone from vercel's header
              const headerTimezone = ctx.headers?.get('x-vercel-ip-timezone');
              // validate timezone from header or fallback to browser timezone
              const timezone =
                headerTimezone && isValidTimezone(headerTimezone)
                  ? headerTimezone
                  : getBrowserTimezone();
              // write default settings against the user
              await db.insertUserSettings({
                ...defaultUserSettings,
                timezone,
              });
            }
          }
        }
      }),
    },
    ...createAuthConfig(),
  });
};

const createAuthConfig = () => {
  console.log('Creating auth config...');
  const cache = redis();
  // Use D1 database instead of Hyperdrive for better-auth
  let db;
  try {
    console.log('Creating database connection...');
    const dbResult = createDb();
    db = dbResult.db;
    console.log('Database connection created successfully');
  } catch (error) {
    console.error('Error creating database connection:', error);
    throw new Error('Failed to initialize database connection');
  }
  
  // Clean the baseURL to remove any spaces
  const cleanBaseURL = env.VITE_PUBLIC_BACKEND_URL?.replace(/\s/g, '') || '';
  
  // Validate required environment variables
  if (!env.BETTER_AUTH_SECRET) {
    throw new Error('BETTER_AUTH_SECRET is required');
  }
  
  if (!env.VITE_PUBLIC_BACKEND_URL) {
    throw new Error('VITE_PUBLIC_BACKEND_URL is required');
  }
  
  if (!env.COOKIE_DOMAIN) {
    throw new Error('COOKIE_DOMAIN is required');
  }
  
  return {
    database: drizzleAdapter(db, { provider: 'sqlite' }),
    secondaryStorage: {
      get: async (key: string) => {
        const value = await cache.get(key);
        return typeof value === 'string' ? value : value ? JSON.stringify(value) : null;
      },
      set: async (key: string, value: string, ttl?: number) => {
        if (ttl) await cache.set(key, value, { ex: ttl });
        else await cache.set(key, value);
      },
      delete: async (key: string) => {
        await cache.del(key);
      },
    },
    advanced: {
      ipAddress: {
        disableIpTracking: true,
      },
      cookiePrefix: env.NODE_ENV === 'development' ? 'better-auth-dev' : 'better-auth',
      crossSubDomainCookies: {
        enabled: true,
        domain: env.COOKIE_DOMAIN,
      },
    },
    baseURL: cleanBaseURL,
    trustedOrigins: [
      'https://app.0.email',
      'https://sapi.0.email',
      'https://staging.0.email',
      'https://0.email',
      'https://zero.prabhatravib.workers.dev',
      'https://infflow.prabhatravib.workers.dev',
      'https://infflow-api-production.prabhatravib.workers.dev',
      'http://localhost:3000',
    ],
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 60 * 60 * 24 * 30, // 30 days
      },
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24 * 3, // 1 day (every 1 day the session expiration is updated)
    },
    socialProviders: (() => {
      try {
        console.log('Configuring social providers...');
        const providers = getSocialProviders(env as unknown as Record<string, string>);
        console.log('Social providers configured:', Object.keys(providers));
        return providers;
      } catch (error) {
        console.error('Error configuring social providers:', error);
        throw error;
      }
    })(),
    account: {
      accountLinking: {
        enabled: true,
        allowDifferentEmails: true,
        trustedProviders: ['google', 'microsoft'],
      },
    },
    onAPIError: {
      onError: (error) => {
        console.error('API Error', error);
      },
      errorURL: `${env.VITE_PUBLIC_APP_URL}/login`,
      throw: true,
    },
  } satisfies BetterAuthOptions;
};

export const createSimpleAuth = () => {
  return betterAuth(createAuthConfig());
};

export type Auth = ReturnType<typeof createAuth>;
export type SimpleAuth = ReturnType<typeof createSimpleAuth>;
