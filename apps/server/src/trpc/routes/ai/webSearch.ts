import { activeDriverProcedure } from '../../trpc';
import { z } from 'zod';

export const webSearch = activeDriverProcedure
  .input(z.object({ query: z.string() }))
  .mutation(async ({ input }) => {
    // Web search functionality removed to reduce bundle size
    return {
      text: `Web search functionality has been removed to reduce bundle size. Query was: "${input.query}"`,
    };
  });
