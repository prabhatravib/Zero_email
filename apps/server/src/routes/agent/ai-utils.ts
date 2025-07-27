// AI utilities that are dynamically imported to reduce startup overhead
import { openai } from '@ai-sdk/openai';
import { streamText, createDataStreamResponse } from 'ai';
import { appendResponseMessages } from 'ai';
import type { StreamTextOnFinishCallback } from 'ai';
import { getPrompt } from '../../lib/brain';
import { getPromptName } from '../../pipelines';
import { AiChatPrompt } from '../../lib/prompts';

export {
  openai,
  streamText,
  createDataStreamResponse,
  appendResponseMessages,
  getPrompt,
  getPromptName,
  AiChatPrompt
};

export type { StreamTextOnFinishCallback }; 