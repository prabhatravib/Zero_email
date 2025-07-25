import { disableBrainFunction, getPrompts } from '../../lib/brain';
import { EProviders, EPrompts, type ISubscribeBatch } from '../../types';
import { activeConnectionProcedure, router } from '../trpc';
import { setSubscribedState } from '../../lib/utils';
import { env } from 'cloudflare:workers';
import { z } from 'zod';

const labelSchema = z.object({
  name: z.string(),
  usecase: z.string(),
});

const labelsSchema = z.array(labelSchema);

export const brainRouter = router({
  enableBrain: activeConnectionProcedure.mutation(async ({ ctx }) => {
    // Brain features disabled - no queue storage
    return false;
  }),
  disableBrain: activeConnectionProcedure.mutation(async ({ ctx }) => {
    const connection = ctx.activeConnection as { id: string; providerId: EProviders };
    return await disableBrainFunction(connection);
  }),

  generateSummary: activeConnectionProcedure
    .input(
      z.object({
        threadId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      // Brain features disabled - no vectorize storage
      return null;
    }),
  getState: activeConnectionProcedure.query(async ({ ctx }) => {
    // Brain features disabled - no KV storage
    return { enabled: false };
  }),
  getLabels: activeConnectionProcedure
    .output(
      z.array(
        z.object({
          name: z.string(),
          usecase: z.string(),
        }),
      ),
    )
    .query(async ({ ctx }) => {
      // Brain features disabled - no KV storage
      return [];
    }),
  getPrompts: activeConnectionProcedure.query(async ({ ctx }) => {
    const connection = ctx.activeConnection;
    return await getPrompts({ connectionId: connection.id });
  }),
  updatePrompt: activeConnectionProcedure
    .input(
      z.object({
        promptType: z.nativeEnum(EPrompts),
        content: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Brain features disabled - no KV storage
      return { success: false, error: 'Brain features disabled' };
    }),
  updateLabels: activeConnectionProcedure
    .input(
      z.object({
        labels: labelsSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Brain features disabled - no KV storage
      return { success: false, error: 'Brain features disabled' };
    }),
});
