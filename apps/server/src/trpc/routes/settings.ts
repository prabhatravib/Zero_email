import { privateProcedure, publicProcedure, router } from '../trpc';
import { defaultUserSettings, userSettingsSchema } from '../../lib/schemas';
import { z } from 'zod';

// Simplified settings router that returns mock data
export const settingsRouter = router({
  get: publicProcedure
    .query(async ({ ctx }) => {
      if (!ctx.sessionUser) return { settings: defaultUserSettings };

      // Return mock settings
      return { settings: defaultUserSettings };
    }),

  save: privateProcedure
    .input(userSettingsSchema.partial())
    .mutation(async ({ input }) => {
      // Return mock success
      return { success: true };
    }),
});
