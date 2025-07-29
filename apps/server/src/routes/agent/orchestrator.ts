import { streamText, tool, type DataStreamWriter, type ToolSet } from 'ai';

import { getZeroAgent } from '../../lib/server-utils';
import { Tools } from '../../types';
import { z } from 'zod';

/**
 * Orchestrator that handles the distinction between tools and agents.
 * Tools execute and return results, while agents stream responses directly.
 */
export class ToolOrchestrator {
  private dataStream: DataStreamWriter;
  private streamingTools: Set<string> = new Set([Tools.WebSearch, Tools.InboxRag]);
  private connectionId: string;

  constructor(dataStream: DataStreamWriter, connectionId: string) {
    this.dataStream = dataStream;
    this.connectionId = connectionId;
  }

  /**
   * Determines if a tool should be treated as an agent that streams
   */
  isStreamingTool(toolName: string): boolean {
    return this.streamingTools.has(toolName);
  }

  /**
   * Creates a streaming agent wrapper for tools that should stream responses directly
   */
  createStreamingAgent(toolName: string, originalTool: any) {
    if (!this.isStreamingTool(toolName)) {
      return originalTool;
    }

    // For webSearch, we want to stream the response directly without wrapping it as a tool result
    if (toolName === Tools.WebSearch) {
      return tool({
        description: 'Search the web for information using Perplexity AI',
        parameters: z.object({
          query: z.string().describe('The query to search the web for'),
        }),
        execute: async ({ query }, { toolCallId }) => {
          try {
            // Web search functionality removed to reduce bundle size
            const response = `Web search functionality has been removed to reduce bundle size. Query was: "${query}"`;
            
            // Stream the response directly to the data stream
            this.dataStream.write({ type: 'text-delta', textDelta: response });

            // Return a placeholder result since the actual streaming happens above
            return { type: 'streaming_response', toolName, toolCallId };
          } catch (error) {
            console.error('Error searching the web:', error);
            throw new Error('Failed to search the web');
          }
        },
      });
    }

    if (toolName === Tools.InboxRag) {
      return tool({
        description:
          'Search the inbox for emails using natural language. Returns only an array of threadIds.',
        parameters: z.object({
          query: z.string().describe('The query to search the inbox for'),
        }),
        execute: async ({ query }) => {
          const agent = await getZeroAgent(this.connectionId);
          const res = await agent.searchThreads({ query, maxResults: 10 });
          return res.threadIds;
        },
      });
    }

    return originalTool;
  }

  /**
   * Processes all tools and returns modified versions for streaming tools
   */
  processTools<T extends ToolSet>(tools: T): T {
    const processedTools = { ...tools };

    for (const [toolName, toolInstance] of Object.entries(tools)) {
      if (this.isStreamingTool(toolName)) {
        processedTools[toolName as keyof T] = this.createStreamingAgent(toolName, toolInstance);
      }
    }

    return processedTools;
  }
}
