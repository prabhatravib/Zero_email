import { router, privateProcedure } from '../trpc';
import { z } from 'zod';

// Simplified labels router that returns mock data
export const labelsRouter = router({
  list: privateProcedure
    .output(
      z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          color: z
            .object({
              backgroundColor: z.string(),
              textColor: z.string(),
            })
            .optional(),
          type: z.string(),
        }),
      ),
    )
    .query(async () => {
      // Return mock labels
      return [
        {
          id: 'INBOX',
          name: 'INBOX',
          type: 'system',
        },
        {
          id: 'SENT',
          name: 'SENT',
          type: 'system',
        },
        {
          id: 'DRAFT',
          name: 'DRAFT',
          type: 'system',
        },
        {
          id: 'SPAM',
          name: 'SPAM',
          type: 'system',
        },
        {
          id: 'TRASH',
          name: 'TRASH',
          type: 'system',
        },
      ];
    }),
  create: privateProcedure
    .input(
      z.object({
        name: z.string(),
        color: z
          .object({
            backgroundColor: z.string(),
            textColor: z.string(),
          })
          .default({
            backgroundColor: '',
            textColor: '',
          }),
      }),
    )
    .mutation(async ({ input }) => {
      // Return mock created label
      return {
        id: `label-${Date.now()}`,
        name: input.name,
        color: input.color,
        type: 'user',
      };
    }),
  update: privateProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        type: z.string().optional(),
        color: z
          .object({
            backgroundColor: z.string(),
            textColor: z.string(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ input }) => {
      // Return mock updated label
      return {
        id: input.id,
        name: input.name,
        color: input.color,
        type: input.type || 'user',
      };
    }),
  delete: privateProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      // Return mock success
      return { success: true };
    }),
});
