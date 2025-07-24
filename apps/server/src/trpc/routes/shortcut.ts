import { privateProcedure, router } from '../trpc';
import { z } from 'zod';

// Simplified shortcut router that returns mock data
export const shortcutRouter = router({
  update: privateProcedure
    .input(
      z.object({
        shortcuts: z.array(z.any()),
      }),
    )
    .mutation(async ({ input }) => {
      // Return mock success
      return { success: true };
    }),
});
