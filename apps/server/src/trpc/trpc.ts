import { getActiveConnection, getZeroDB } from '../lib/server-utils';
import type { HonoContext, HonoVariables } from '../ctx';
import { initTRPC, TRPCError } from '@trpc/server';

import type { Context } from 'hono';
import superjson from 'superjson';

type TrpcContext = {
    c: Context<HonoContext>;
} & HonoVariables;

const t = initTRPC.context<TrpcContext>().create({
    transformer: superjson,
    errorFormatter({ shape, error }) {
        return {
            ...shape,
            data: {
                ...shape.data,
                code: error.code,
                httpStatus: shape.data.httpStatus,
            },
        };
    },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const privateProcedure = publicProcedure.use(async ({ ctx, next }) => {
    console.log('🔍 privateProcedure - Checking session user:', ctx.sessionUser ? 'present' : 'null');
    
    if (!ctx.sessionUser) {
        console.error('🔍 privateProcedure - No session user found, throwing UNAUTHORIZED');
        throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Authentication required. Please log in.',
        });
    }

    console.log('🔍 privateProcedure - Session user authenticated:', ctx.sessionUser.email);
    return next({ ctx: { ...ctx, sessionUser: ctx.sessionUser } });
});

export const activeConnectionProcedure = privateProcedure.use(async ({ ctx, next }) => {
    try {
        console.log('🔍 activeConnectionProcedure - Getting active connection for user:', ctx.sessionUser.email);
        const activeConnection = await getActiveConnection();
        console.log('🔍 activeConnectionProcedure - Active connection found:', activeConnection.email);
        return next({ ctx: { ...ctx, activeConnection } });
    } catch (err) {
        console.error('🔍 activeConnectionProcedure - Error getting active connection:', err);
        throw new TRPCError({
            code: 'BAD_REQUEST',
            message: err instanceof Error ? err.message : 'Failed to get active connection',
        });
    }
});

export const activeDriverProcedure = activeConnectionProcedure.use(async ({ ctx, next }) => {
    const { activeConnection, sessionUser } = ctx;
    console.log('🔍 activeDriverProcedure - Processing request for user:', sessionUser.email);
    
    const res = await next({ ctx: { ...ctx } });

    // This is for when the user has not granted the required scopes for GMail
    if (!res.ok && res.error.message === 'Precondition check failed.') {
        throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Required scopes missing',
            cause: res.error,
        });
    }

    if (!res.ok && res.error.message === 'invalid_grant') {
        // Remove the access token and refresh token
        const db = await getZeroDB(sessionUser.id);
        await db.updateConnection(activeConnection.id, {
            accessToken: null,
            refreshToken: null,
        });

        ctx.c.header(
            'X-Zero-Redirect',
            `/settings/connections?disconnectedConnectionId=${activeConnection.id}`,
        );

        throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Connection expired. Please reconnect.',
            cause: res.error,
        });
    }

    return res;
});

// Simple pass-through middleware (no rate limiting)
export const createRateLimiterMiddleware = (config: {
    limiter: any;
    generatePrefix: (ctx: TrpcContext, input: any) => string;
}) =>
    t.middleware(async ({ next }) => {
        // No rate limiting - allow all requests
        return next();
    });
