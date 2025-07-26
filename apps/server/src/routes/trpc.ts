import { trpcServer } from '@hono/trpc-server';
import { appRouter } from '../trpc';
import { trpcContextMiddleware } from '../middleware/trpc-context';
import type { HonoContext } from '../ctx';
import type { Hono } from 'hono';

export const registerTrpcRoutes = (app: Hono<HonoContext>) => {
    app.use('/api/trpc', trpcContextMiddleware)
       .use('/api/trpc', trpcServer({
           router: appRouter,
       }));
}; 