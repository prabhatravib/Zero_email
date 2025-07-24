import { router, privateProcedure } from '../trpc';
import { z } from 'zod';

// Simplified drafts router that returns mock data
export const draftsRouter = router({
  create: privateProcedure
    .input(z.object({
      to: z.array(z.object({ email: z.string(), name: z.string().optional() })),
      subject: z.string(),
      message: z.string(),
      attachments: z.array(z.any()).optional().default([]),
      headers: z.record(z.string()).optional().default({}),
      cc: z.array(z.object({ email: z.string(), name: z.string().optional() })).optional(),
      bcc: z.array(z.object({ email: z.string(), name: z.string().optional() })).optional(),
      threadId: z.string().optional(),
      fromEmail: z.string().optional(),
      isForward: z.boolean().optional(),
      originalMessage: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Return mock draft
      return {
        id: `draft-${Date.now()}`,
        message: {
          id: `draft-${Date.now()}`,
          threadId: input.threadId || `thread-${Date.now()}`,
          labelIds: ['DRAFT'],
          snippet: input.message.substring(0, 100) + '...',
          payload: {
            headers: {
              subject: input.subject,
              from: input.fromEmail || 'user@example.com',
              to: input.to.map(t => t.email).join(', '),
              date: new Date().toISOString(),
            },
            body: {
              data: btoa(input.message),
            },
          },
          internalDate: Date.now().toString(),
        },
      };
    }),
  get: privateProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      // Return mock draft
      return {
        id: input.id,
        threadId: `thread-${Date.now()}`,
        labelIds: ['DRAFT'],
        snippet: 'This is a mock draft message...',
        payload: {
          headers: {
            subject: 'Mock Draft Subject',
            from: 'user@example.com',
            to: 'recipient@example.com',
            date: new Date().toISOString(),
          },
          body: {
            data: btoa('This is the mock draft body content.'),
          },
        },
        internalDate: Date.now().toString(),
      };
    }),
  list: privateProcedure
    .input(
      z.object({
        q: z.string().optional(),
        maxResults: z.number().optional(),
        pageToken: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      // Return mock drafts list
      return {
        drafts: [],
        nextPageToken: null,
      };
    }),
});
