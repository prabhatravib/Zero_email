import { activeDriverProcedure } from '../../trpc';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { z } from 'zod';

export const webSearch = activeDriverProcedure
  .input(z.object({ query: z.string() }))
  .mutation(async ({ input }) => {
    const result = await generateText({
      model: openai('gpt-4o-mini'),
      system:
        'You are a helpful assistant that can search the web for information. NEVER include sources or sources references in your response. NEVER use markdown formatting in your response.',
      messages: [{ role: 'user', content: input.query }],
      maxTokens: 1024,
    });
    return result;
  });
