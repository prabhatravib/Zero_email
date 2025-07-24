import { router, privateProcedure } from '../trpc';
import { z } from 'zod';

const labelSchema = z.object({
  name: z.string(),
  usecase: z.string(),
});

const labelsSchema = z.array(labelSchema);

// Simplified brain router that returns mock data
export const brainRouter = router({
  enableBrain: privateProcedure.mutation(async () => {
    // Return mock success
    return true;
  }),
  disableBrain: privateProcedure.mutation(async () => {
    // Return mock success
    return { success: true };
  }),
  generateSummary: privateProcedure
    .input(
      z.object({
        threadId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      // Return mock summary
      return {
        data: {
          short: 'This is a mock summary of the email thread.',
        },
      };
    }),
  getState: privateProcedure.query(async () => {
    // Return mock state
    return { enabled: false };
  }),
  getLabels: privateProcedure
    .output(
      z.array(
        z.object({
          name: z.string(),
          usecase: z.string(),
        }),
      ),
    )
    .query(async () => {
      // Return mock labels
      return [
        { name: 'Important', usecase: 'Mark important emails' },
        { name: 'Follow-up', usecase: 'Emails that need follow-up' },
        { name: 'Archive', usecase: 'Emails to archive' },
      ];
    }),
  getPrompts: privateProcedure.query(async () => {
    // Return mock prompts
    return {
      summary: 'Summarize this email thread',
      reply: 'Generate a reply to this email',
      draft: 'Create a draft email',
    };
  }),
  updatePrompt: privateProcedure
    .input(
      z.object({
        promptType: z.string(),
        content: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      // Return mock success
      return { success: true };
    }),
  updateLabels: privateProcedure
    .input(
      z.object({
        labels: labelsSchema,
      }),
    )
    .mutation(async ({ input }) => {
      // Return mock success
      return { success: true };
    }),
});
