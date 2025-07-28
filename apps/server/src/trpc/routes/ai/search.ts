import {
  GmailSearchAssistantSystemPrompt,
  OutlookSearchAssistantSystemPrompt,
} from '../../../lib/prompts';
import { activeDriverProcedure } from '../../trpc';
import { env } from 'cloudflare:workers';
import { generateObject } from 'ai';
import { z } from 'zod';

// Lazy load heavy imports
let openaiApi: typeof import('@ai-sdk/openai') | undefined;

async function getOpenAI() {
  if (!openaiApi) openaiApi = await import('@ai-sdk/openai');
  return openaiApi.openai;
}

export const generateSearchQuery = activeDriverProcedure
  .input(z.object({ query: z.string() }))
  .mutation(async ({ input, ctx }) => {
    const {
      activeConnection: { providerId },
    } = ctx;
    const systemPrompt =
      providerId === 'google'
        ? GmailSearchAssistantSystemPrompt()
        : providerId === 'microsoft'
          ? OutlookSearchAssistantSystemPrompt()
          : '';

    const result = await generateObject({
      model: (await getOpenAI())(env.OPENAI_MODEL || 'gpt-4o'),
      system: systemPrompt,
      prompt: input.query,
      schema: z.object({
        query: z.string(),
      }),
      output: 'object',
    });

    return result.object;
  });
