import {
  IGetThreadResponseSchema,
  IGetThreadsResponseSchema,
  type IGetThreadsResponse,
} from '../../lib/driver/types';
import { router, privateProcedure } from '../trpc';
import { z } from 'zod';

// Simplified mail router that returns mock data
export const mailRouter = router({
  get: privateProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .output(IGetThreadResponseSchema)
    .query(async ({ input }) => {
      // Return mock data for now
      return {
        id: input.id,
        threadId: input.id,
        historyId: 'mock-history-id',
        messages: [
          {
            id: 'mock-message-id',
            threadId: input.id,
            labelIds: ['INBOX'],
            snippet: 'This is a mock email message...',
            payload: {
              headers: {
                subject: 'Mock Email Subject',
                from: 'sender@example.com',
                to: 'recipient@example.com',
                date: new Date().toISOString(),
              },
              body: {
                data: btoa('This is the mock email body content.'),
              },
            },
            internalDate: Date.now().toString(),
          },
        ],
      };
    }),
  count: privateProcedure
    .output(
      z.array(
        z.object({
          count: z.number().optional(),
          label: z.string().optional(),
        }),
      ),
    )
    .query(async () => {
      // Return mock counts
      return [
        { count: 0, label: 'INBOX' },
        { count: 0, label: 'SENT' },
        { count: 0, label: 'DRAFT' },
        { count: 0, label: 'SPAM' },
        { count: 0, label: 'TRASH' },
      ];
    }),
  listThreads: privateProcedure
    .input(
      z.object({
        folder: z.string().optional().default('inbox'),
        q: z.string().optional().default(''),
        maxResults: z.number().optional().default(50),
        cursor: z.string().optional().default(''),
        labelIds: z.array(z.string()).optional().default([]),
      }),
    )
    .output(IGetThreadsResponseSchema)
    .query(async ({ input }) => {
      // Return mock threads data
      return {
        threads: [],
        nextPageToken: null,
      };
    }),
});
