import { createRateLimiterMiddleware, privateProcedure, publicProcedure, router } from '../trpc';
import { getActiveConnection, getZeroDB } from '../../lib/server-utils';

import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const connectionsRouter = router({
  list: privateProcedure
    .use(
      createRateLimiterMiddleware({
        limiter: { window: '1m', limit: 120 },
        generatePrefix: ({ sessionUser }) => `ratelimit:get-connections-${sessionUser?.id || 'anonymous'}`,
      }),
    )
    .query(async ({ ctx }) => {
      try {
        const { sessionUser } = ctx;
        if (!sessionUser) {
          return { connections: [], disconnectedIds: [] };
        }

        const db = await getZeroDB(sessionUser.id);
        const connections = await db.findManyConnections();

        const disconnectedIds = connections
          .filter((c) => !c.accessToken || !c.refreshToken)
          .map((c) => c.id);

        return {
          connections: connections.map((connection) => {
            return {
              id: connection.id,
              email: connection.email,
              name: connection.name,
              picture: connection.picture,
              createdAt: connection.createdAt,
              providerId: connection.providerId,
            };
          }),
          disconnectedIds,
        };
      } catch (error) {
        console.error('Error in connections.list:', error);
        return { connections: [], disconnectedIds: [] };
      }
    }),
  setDefault: privateProcedure
    .input(z.object({ connectionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { connectionId } = input;
      const user = ctx.sessionUser;
      const db = await getZeroDB(user.id);
      const foundConnection = await db.findUserConnection(connectionId);
      if (!foundConnection) throw new TRPCError({ code: 'NOT_FOUND' });
      await db.updateUser({ defaultConnectionId: connectionId });
    }),
  delete: privateProcedure
    .input(z.object({ connectionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { connectionId } = input;
      const user = ctx.sessionUser;
      const db = await getZeroDB(user.id);
      await db.deleteConnection(connectionId);

      const activeConnection = await getActiveConnection();
      if (connectionId === activeConnection.id) await db.updateUser({ defaultConnectionId: null });
    }),
  getDefault: publicProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.sessionUser) return null;
      
      const connection = await getActiveConnection();
      return {
        id: connection.id,
        email: connection.email,
        name: connection.name,
        picture: connection.picture,
        createdAt: connection.createdAt,
        providerId: connection.providerId,
      };
    } catch (error) {
      console.log('No active connection found in getDefault');
      return null;
    }
  }),
});
