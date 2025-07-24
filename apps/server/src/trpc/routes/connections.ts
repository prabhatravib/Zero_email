import { privateProcedure, publicProcedure, router } from '../trpc';
import { z } from 'zod';

// Simplified connections router that returns mock data
export const connectionsRouter = router({
  list: privateProcedure
    .query(async ({ ctx }) => {
      // Return mock connections
      return {
        connections: [
          {
            id: 'mock-connection-id',
            email: ctx.sessionUser?.email || 'user@example.com',
            name: ctx.sessionUser?.name || 'Mock User',
            picture: ctx.sessionUser?.image || '',
            createdAt: new Date().toISOString(),
            providerId: 'google',
          },
        ],
        disconnectedIds: [],
      };
    }),
  setDefault: privateProcedure
    .input(z.object({ connectionId: z.string() }))
    .mutation(async ({ input }) => {
      // Return mock success
      return { success: true };
    }),
  delete: privateProcedure
    .input(z.object({ connectionId: z.string() }))
    .mutation(async ({ input }) => {
      // Return mock success
      return { success: true };
    }),
  getDefault: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.sessionUser) return null;
    
    // Return mock default connection
    return {
      id: 'mock-connection-id',
      email: ctx.sessionUser.email,
      name: ctx.sessionUser.name,
      picture: ctx.sessionUser.image,
      createdAt: new Date().toISOString(),
      providerId: 'google',
    };
  }),
});
