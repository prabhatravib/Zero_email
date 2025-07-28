/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { createDefaultWorkflows } from './thread-workflow-utils/workflow-engine';
import { getServiceAccount } from './lib/factories/google-subscription.factory';
import { EWorkflowType, runWorkflow } from './pipelines';
import { getZeroAgent } from './lib/server-utils';
import { type gmail_v1 } from '@googleapis/gmail';
import { Effect, Console, Logger } from 'effect';
import { env } from 'cloudflare:workers';
import { connection } from './db/schema';
import { EProviders } from './types';
import { eq } from 'drizzle-orm';
import { createDb } from './db';

const showLogs = true;

const log = (message: string, ...args: any[]) => {
  if (showLogs) {
    console.log(message, ...args);
    return message;
  }
  return 'no message';
};

// Configure pretty logger to stderr
export const loggerLayer = Logger.add(Logger.prettyLogger({ stderr: true }));

const isValidUUID = (str: string): boolean => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(str);
};

// Define the workflow parameters type
type MainWorkflowParams = {
  providerId: string;
  historyId: string;
  subscriptionName: string;
};

// Define error types
type MainWorkflowError =
  | { _tag: 'MissingEnvironmentVariable'; variable: string }
  | { _tag: 'InvalidSubscriptionName'; subscriptionName: string }
  | { _tag: 'InvalidConnectionId'; connectionId: string }
  | { _tag: 'UnsupportedProvider'; providerId: string }
  | { _tag: 'WorkflowCreationFailed'; error: unknown };

const validateArguments = (
  params: MainWorkflowParams,
  serviceAccount: { project_id: string },
): Effect.Effect<string, MainWorkflowError> =>
  Effect.gen(function* () {
    yield* Console.log('[MAIN_WORKFLOW] Validating arguments');
    const regex = new RegExp(
      `projects/${serviceAccount.project_id}/subscriptions/notifications__([a-z0-9-]+)`,
    );
    const match = params.subscriptionName.toString().match(regex);
    if (!match) {
      yield* Console.log('[MAIN_WORKFLOW] Invalid subscription name:', params.subscriptionName);
      return yield* Effect.fail({
        _tag: 'InvalidSubscriptionName' as const,
        subscriptionName: params.subscriptionName,
      });
    }
    const [, connectionId] = match;
    yield* Console.log('[MAIN_WORKFLOW] Extracted connectionId:', connectionId);
    return connectionId;
  });

/**
 * This function runs the main workflow. The main workflow is responsible for processing incoming messages from a Pub/Sub subscription and passing them to the appropriate pipeline.
 * It validates the subscription name and extracts the connection ID.
 * @param params
 * @returns
 */
export const runMainWorkflow = (
  params: MainWorkflowParams,
): Effect.Effect<string, MainWorkflowError> =>
  Effect.gen(function* () {
    yield* Console.log('[MAIN_WORKFLOW] Starting workflow with payload:', params);

    const { providerId, historyId } = params;

    const serviceAccount = getServiceAccount();

    const connectionId = yield* validateArguments(params, serviceAccount);

    if (!isValidUUID(connectionId)) {
      yield* Console.log('[MAIN_WORKFLOW] Invalid connection id format:', connectionId);
      return yield* Effect.fail({
        _tag: 'InvalidConnectionId' as const,
        connectionId,
      });
    }

    const previousHistoryId = yield* Effect.tryPromise({
      try: () => env.gmail_history_id.get(connectionId),
      catch: () => ({ _tag: 'WorkflowCreationFailed' as const, error: 'Failed to get history ID' }),
    }).pipe(Effect.orElse(() => Effect.succeed(null)));

    if (providerId === EProviders.google) {
      yield* Console.log('[MAIN_WORKFLOW] Processing Google provider workflow');
      yield* Console.log('[MAIN_WORKFLOW] Previous history ID:', previousHistoryId);

      const zeroWorkflowParams = {
        connectionId,
        historyId: previousHistoryId || historyId,
        nextHistoryId: historyId,
      };

      const result = yield* runWorkflow(EWorkflowType.ZERO, zeroWorkflowParams).pipe(
        Effect.mapError(
          (error): MainWorkflowError => ({ _tag: 'WorkflowCreationFailed' as const, error }),
        ),
      );

      yield* Console.log('[MAIN_WORKFLOW] Zero workflow result:', result);
    } else {
      yield* Console.log('[MAIN_WORKFLOW] Unsupported provider:', providerId);
      return yield* Effect.fail({
        _tag: 'UnsupportedProvider' as const,
        providerId,
      });
    }

    yield* Console.log('[MAIN_WORKFLOW] Workflow completed successfully');
    return 'Workflow completed successfully';
  }).pipe(
    Effect.tapError((error) => Console.log('[MAIN_WORKFLOW] Error in workflow:', error)),
    Effect.provide(loggerLayer),
  );

// Define the ZeroWorkflow parameters type
type ZeroWorkflowParams = {
  connectionId: string;
  historyId: string;
  nextHistoryId: string;
};

// Define error types for ZeroWorkflow
type ZeroWorkflowError =
  | { _tag: 'HistoryAlreadyProcessing'; connectionId: string; historyId: string }
  | { _tag: 'ConnectionNotFound'; connectionId: string }
  | { _tag: 'ConnectionNotAuthorized'; connectionId: string }
  | { _tag: 'HistoryNotFound'; historyId: string; connectionId: string }
  | { _tag: 'UnsupportedProvider'; providerId: string }
  | { _tag: 'DatabaseError'; error: unknown }
  | { _tag: 'GmailApiError'; error: unknown }
  | { _tag: 'WorkflowCreationFailed'; error: unknown }
  | { _tag: 'LabelModificationFailed'; error: unknown; threadId: string };

export const runZeroWorkflow = (
  params: ZeroWorkflowParams,
): Effect.Effect<string, ZeroWorkflowError> =>
  Effect.gen(function* () {
    yield* Console.log('[ZERO_WORKFLOW] Starting workflow with payload:', params);
    const { connectionId, historyId, nextHistoryId } = params;

    const historyProcessingKey = `history_${connectionId}__${historyId}`;

    // Atomic lock acquisition to prevent race conditions
    const lockAcquired = yield* Effect.tryPromise({
      try: async () => {
        const response = await env.gmail_processing_threads.put(historyProcessingKey, 'true', {
          expirationTtl: 3600,
        });
        return response !== null; // null means key already existed
      },
      catch: (error) => ({ _tag: 'WorkflowCreationFailed' as const, error }),
    });

    if (!lockAcquired) {
      yield* Console.log('[ZERO_WORKFLOW] History already being processed:', {
        connectionId,
        historyId,
      });
      return yield* Effect.fail({
        _tag: 'HistoryAlreadyProcessing' as const,
        connectionId,
        historyId,
      });
    }

    yield* Console.log(
      '[ZERO_WORKFLOW] Acquired processing lock for history:',
      historyProcessingKey,
    );

    const { db, conn } = createDb(env.HYPERDRIVE.connectionString);

    const foundConnection = yield* Effect.tryPromise({
      try: async () => {
        console.log('[ZERO_WORKFLOW] Finding connection:', connectionId);
        const [foundConnection] = await db
          .select()
          .from(connection)
          .where(eq(connection.id, connectionId.toString()));
        await conn.end();
        if (!foundConnection) {
          throw new Error(`Connection not found ${connectionId}`);
        }
        if (!foundConnection.accessToken || !foundConnection.refreshToken) {
          throw new Error(`Connection is not authorized ${connectionId}`);
        }
        console.log('[ZERO_WORKFLOW] Found connection:', foundConnection.id);
        return foundConnection;
      },
      catch: (error) => ({ _tag: 'DatabaseError' as const, error }),
    });

    yield* Effect.tryPromise({
      try: async () => conn.end(),
      catch: (error) => ({ _tag: 'DatabaseError' as const, error }),
    });

    const agent = yield* Effect.tryPromise({
      try: async () => await getZeroAgent(foundConnection.id),
      catch: (error) => ({ _tag: 'DatabaseError' as const, error }),
    });

    if (foundConnection.providerId === EProviders.google) {
      yield* Console.log('[ZERO_WORKFLOW] Processing Google provider workflow');

      const history = yield* Effect.tryPromise({
        try: async () => {
          console.log('[ZERO_WORKFLOW] Getting Gmail history with ID:', historyId);
          const { history } = (await agent.listHistory(historyId.toString())) as {
            history: gmail_v1.Schema$History[];
          };
          console.log('[ZERO_WORKFLOW] Found history entries:', history);
          return history;
        },
        catch: (error) => ({ _tag: 'GmailApiError' as const, error }),
      });

      yield* Effect.tryPromise({
        try: () => {
          console.log('[ZERO_WORKFLOW] Updating next history ID:', nextHistoryId);
          return env.gmail_history_id.put(connectionId.toString(), nextHistoryId.toString());
        },
        catch: (error) => ({ _tag: 'WorkflowCreationFailed' as const, error }),
      });

      if (!history.length) {
        yield* Console.log('[ZERO_WORKFLOW] No history found, skipping');
        return 'No history found';
      }

      // Extract thread IDs from history and track label changes
      const threadsAdded = new Set<string>();
      const threadLabelChanges = new Map<
        string,
        { addLabels: Set<string>; removeLabels: Set<string> }
      >();

      // Optimal single-pass functional processing
      const processLabelChange = (
        labelChange: { message?: gmail_v1.Schema$Message; labelIds?: string[] | null },
        isAddition: boolean,
      ) => {
        const threadId = labelChange.message?.threadId;
        if (!threadId || !labelChange.labelIds?.length) return;

        let changes = threadLabelChanges.get(threadId);
        if (!changes) {
          changes = { addLabels: new Set<string>(), removeLabels: new Set<string>() };
          threadLabelChanges.set(threadId, changes);
        }

        const targetSet = isAddition ? changes.addLabels : changes.removeLabels;
        labelChange.labelIds.forEach((labelId) => targetSet.add(labelId));
      };

      history.forEach((historyItem) => {
        // Extract thread IDs from messages
        historyItem.messagesAdded?.forEach((msg) => {
          if (msg.message?.threadId) {
            threadsAdded.add(msg.message.threadId);
          }
        });

        // Process label changes using shared helper
        historyItem.labelsAdded?.forEach((labelAdded) => processLabelChange(labelAdded, true));
        historyItem.labelsRemoved?.forEach((labelRemoved) =>
          processLabelChange(labelRemoved, false),
        );
      });

      yield* Console.log(
        '[ZERO_WORKFLOW] Found unique thread IDs:',
        Array.from(threadLabelChanges.keys()),
        Array.from(threadsAdded),
      );

      if (threadsAdded.size > 0) {
        const threadWorkflowParams = Array.from(threadsAdded);

        // Sync threads with proper error handling - use allSuccesses to collect successful syncs
        const syncResults = yield* Effect.allSuccesses(
          threadWorkflowParams.map((threadId) =>
            Effect.tryPromise({
              try: async () => {
                const result = await agent.syncThread({ threadId });
                console.log(`[ZERO_WORKFLOW] Successfully synced thread ${threadId}`);
                return { threadId, result };
              },
              catch: (error) => {
                console.error(`[ZERO_WORKFLOW] Failed to sync thread ${threadId}:`, error);
                // Let this effect fail so allSuccesses will exclude it
                throw new Error(
                  `Failed to sync thread ${threadId}: ${error instanceof Error ? error.message : String(error)}`,
                );
              },
            }),
          ),
          { concurrency: 1 }, // Limit concurrency to avoid rate limits
        );

        const syncedCount = syncResults.length;
        const failedCount = threadWorkflowParams.length - syncedCount;

        if (failedCount > 0) {
          yield* Console.log(
            `[ZERO_WORKFLOW] Warning: ${failedCount}/${threadWorkflowParams.length} thread syncs failed. Successfully synced: ${syncedCount}`,
          );
          // Continue with processing - sync failures shouldn't stop the entire workflow
          // The thread processing will continue with whatever data is available
        } else {
          yield* Console.log(`[ZERO_WORKFLOW] Successfully synced all ${syncedCount} threads`);
        }

        yield* Console.log('[ZERO_WORKFLOW] Synced threads:', syncResults);

        // Run thread workflow for each successfully synced thread
        if (syncedCount > 0) {
          yield* Effect.tryPromise({
            try: () => agent.reloadFolder('inbox'),
            catch: (error) => ({ _tag: 'GmailApiError' as const, error }),
          }).pipe(
            Effect.tap(() => Console.log('[ZERO_WORKFLOW] Successfully reloaded inbox folder')),
            Effect.orElse(() =>
              Effect.gen(function* () {
                yield* Console.log('[ZERO_WORKFLOW] Failed to reload inbox folder');
                return undefined;
              }),
            ),
          );

          yield* Console.log(
            `[ZERO_WORKFLOW] Running thread workflows for ${syncedCount} synced threads`,
          );

          const threadWorkflowResults = yield* Effect.allSuccesses(
            syncResults.map(({ threadId }) =>
              runWorkflow(EWorkflowType.THREAD, {
                connectionId,
                threadId,
                providerId: foundConnection.providerId,
              }).pipe(
                Effect.tap(() =>
                  Console.log(`[ZERO_WORKFLOW] Successfully ran thread workflow for ${threadId}`),
                ),
                Effect.tapError((error) =>
                  Console.log(
                    `[ZERO_WORKFLOW] Failed to run thread workflow for ${threadId}:`,
                    error,
                  ),
                ),
              ),
            ),
            { concurrency: 1 }, // Limit concurrency to avoid overwhelming the system
          );

          const threadWorkflowSuccessCount = threadWorkflowResults.length;
          const threadWorkflowFailedCount = syncedCount - threadWorkflowSuccessCount;

          if (threadWorkflowFailedCount > 0) {
            yield* Console.log(
              `[ZERO_WORKFLOW] Warning: ${threadWorkflowFailedCount}/${syncedCount} thread workflows failed. Successfully processed: ${threadWorkflowSuccessCount}`,
            );
          } else {
            yield* Console.log(
              `[ZERO_WORKFLOW] Successfully ran all ${threadWorkflowSuccessCount} thread workflows`,
            );
          }
        }
      }

      // Process label changes for threads
      if (threadLabelChanges.size > 0) {
        yield* Console.log(
          `[ZERO_WORKFLOW] Processing label changes for ${threadLabelChanges.size} threads`,
        );

        // Process each thread's label changes
        for (const [threadId, changes] of threadLabelChanges) {
          const addLabels = Array.from(changes.addLabels);
          const removeLabels = Array.from(changes.removeLabels);

          // Only call if there are actual changes to make
          if (addLabels.length > 0 || removeLabels.length > 0) {
            yield* Console.log(
              `[ZERO_WORKFLOW] Modifying labels for thread ${threadId}: +${addLabels.length} -${removeLabels.length}`,
            );
            yield* Effect.tryPromise({
              try: () => agent.modifyThreadLabelsInDB(threadId, addLabels, removeLabels),
              catch: (error) => ({ _tag: 'LabelModificationFailed' as const, error, threadId }),
            }).pipe(
              Effect.orElse(() =>
                Effect.gen(function* () {
                  yield* Console.log(
                    `[ZERO_WORKFLOW] Failed to modify labels for thread ${threadId}`,
                  );
                  return undefined;
                }),
              ),
            );
          }
        }

        yield* Console.log('[ZERO_WORKFLOW] Completed label modifications');
      } else {
        yield* Console.log('[ZERO_WORKFLOW] No threads with label changes to process');
      }

      // Clean up processing flag
      yield* Effect.tryPromise({
        try: () => {
          console.log(
            '[ZERO_WORKFLOW] Clearing processing flag for history:',
            historyProcessingKey,
          );
          return env.gmail_processing_threads.delete(historyProcessingKey);
        },
        catch: (error) => ({ _tag: 'WorkflowCreationFailed' as const, error }),
      }).pipe(Effect.orElse(() => Effect.succeed(null)));

      yield* Console.log('[ZERO_WORKFLOW] Processing complete');
      return 'Zero workflow completed successfully';
    } else {
      yield* Console.log('[ZERO_WORKFLOW] Unsupported provider:', foundConnection.providerId);
      return yield* Effect.fail({
        _tag: 'UnsupportedProvider' as const,
        providerId: foundConnection.providerId,
      });
    }
  }).pipe(
    Effect.tapError((error) => Console.log('[ZERO_WORKFLOW] Error in workflow:', error)),
    Effect.catchAll((error) => {
      // Clean up processing flag on error
      return Effect.tryPromise({
        try: () => {
          console.log(
            '[ZERO_WORKFLOW] Clearing processing flag for history after error:',
            `history_${params.connectionId}__${params.historyId}`,
          );
          return env.gmail_processing_threads.delete(
            `history_${params.connectionId}__${params.historyId}`,
          );
        },
        catch: () => ({
          _tag: 'WorkflowCreationFailed' as const,
          error: 'Failed to cleanup processing flag',
        }),
      }).pipe(
        Effect.orElse(() => Effect.succeed(null)),
        Effect.flatMap(() => Effect.fail(error)),
      );
    }),
    Effect.provide(loggerLayer),
  );

// Define the ThreadWorkflow parameters type
type ThreadWorkflowParams = {
  connectionId: string;
  threadId: string;
  providerId: string;
};

// Define error types for ThreadWorkflow
type ThreadWorkflowError =
  | { _tag: 'ConnectionNotFound'; connectionId: string }
  | { _tag: 'ConnectionNotAuthorized'; connectionId: string }
  | { _tag: 'ThreadNotFound'; threadId: string }
  | { _tag: 'UnsupportedProvider'; providerId: string }
  | { _tag: 'DatabaseError'; error: unknown }
  | { _tag: 'GmailApiError'; error: unknown }
  | { _tag: 'VectorizationError'; error: unknown }
  | { _tag: 'WorkflowCreationFailed'; error: unknown };

/**
 * Runs the main workflow for processing a thread. The workflow is responsible for processing incoming messages from a Pub/Sub subscription and passing them to the appropriate pipeline.
 * @param params
 * @returns
 */
export const runThreadWorkflow = (
  params: ThreadWorkflowParams,
): Effect.Effect<string, ThreadWorkflowError> =>
  Effect.gen(function* () {
    yield* Console.log('[THREAD_WORKFLOW] Starting workflow with payload:', params);
    const { connectionId, threadId, providerId } = params;

    if (providerId === EProviders.google) {
      yield* Console.log('[THREAD_WORKFLOW] Processing Google provider workflow');
      const { db, conn } = createDb(env.HYPERDRIVE.connectionString);

      const foundConnection = yield* Effect.tryPromise({
        try: async () => {
          console.log('[THREAD_WORKFLOW] Finding connection:', connectionId);
          const [foundConnection] = await db
            .select()
            .from(connection)
            .where(eq(connection.id, connectionId.toString()));
          if (!foundConnection) {
            throw new Error(`Connection not found ${connectionId}`);
          }
          if (!foundConnection.accessToken || !foundConnection.refreshToken) {
            throw new Error(`Connection is not authorized ${connectionId}`);
          }
          console.log('[THREAD_WORKFLOW] Found connection:', foundConnection.id);
          return foundConnection;
        },
        catch: (error) => ({ _tag: 'DatabaseError' as const, error }),
      });

      yield* Effect.tryPromise({
        try: async () => conn.end(),
        catch: (error) => ({ _tag: 'DatabaseError' as const, error }),
      });

      const agent = yield* Effect.tryPromise({
        try: async () => await getZeroAgent(foundConnection.id),
        catch: (error) => ({ _tag: 'DatabaseError' as const, error }),
      });

      const thread = yield* Effect.tryPromise({
        try: async () => {
          console.log('[THREAD_WORKFLOW] Getting thread:', threadId);
          const thread = await agent.getThread(threadId.toString());
          console.log('[THREAD_WORKFLOW] Found thread with messages:', thread.messages.length);
          return thread;
        },
        catch: (error) => ({ _tag: 'GmailApiError' as const, error }),
      });

      if (!thread.messages || thread.messages.length === 0) {
        yield* Console.log('[THREAD_WORKFLOW] Thread has no messages, skipping processing');
        return 'Thread has no messages';
      }

      // Initialize workflow engine with default workflows
      const workflowEngine = createDefaultWorkflows();

      // Create workflow context
      const workflowContext = {
        connectionId: connectionId.toString(),
        threadId: threadId.toString(),
        thread,
        foundConnection,
        agent,
        env,
      };

      // Execute configured workflows using the workflow engine
      const workflowResults = yield* Effect.tryPromise({
        try: async () => {
          const allResults = new Map<string, any>();
          const allErrors = new Map<string, Error>();

          // Execute all workflows registered in the engine
          const workflowNames = workflowEngine.getWorkflowNames();

          for (const workflowName of workflowNames) {
            console.log(`[THREAD_WORKFLOW] Executing workflow: ${workflowName}`);

            try {
              const { results, errors } = await workflowEngine.executeWorkflow(
                workflowName,
                workflowContext,
              );

              // Merge results and errors using efficient Map operations
              results.forEach((value, key) => allResults.set(key, value));
              errors.forEach((value, key) => allErrors.set(key, value));

              console.log(`[THREAD_WORKFLOW] Completed workflow: ${workflowName}`);
            } catch (error) {
              console.error(`[THREAD_WORKFLOW] Failed to execute workflow ${workflowName}:`, error);
              const errorObj = error instanceof Error ? error : new Error(String(error));
              allErrors.set(workflowName, errorObj);
            }
          }

          return { results: allResults, errors: allErrors };
        },
        catch: (error) => ({ _tag: 'WorkflowCreationFailed' as const, error }),
      });

      // Log workflow results
      const successfulSteps = Array.from(workflowResults.results.keys());
      const failedSteps = Array.from(workflowResults.errors.keys());

      if (successfulSteps.length > 0) {
        yield* Console.log('[THREAD_WORKFLOW] Successfully executed steps:', successfulSteps);
      }

      if (failedSteps.length > 0) {
        yield* Console.log('[THREAD_WORKFLOW] Failed steps:', failedSteps);
        // Log errors efficiently using forEach to avoid nested iteration
        workflowResults.errors.forEach((error, stepId) => {
          console.log(`[THREAD_WORKFLOW] Error in step ${stepId}:`, error.message);
        });
      }

      // Clean up thread processing flag
      yield* Effect.tryPromise({
        try: () => {
          console.log('[THREAD_WORKFLOW] Clearing processing flag for thread:', threadId);
          return env.gmail_processing_threads.delete(threadId.toString());
        },
        catch: (error) => ({ _tag: 'DatabaseError' as const, error }),
      }).pipe(Effect.orElse(() => Effect.succeed(null)));

      yield* Effect.tryPromise({
        try: async () => conn.end(),
        catch: (error) => ({ _tag: 'DatabaseError' as const, error }),
      });

      yield* Console.log('[THREAD_WORKFLOW] Thread processing complete');
      return 'Thread workflow completed successfully';
    } else {
      yield* Console.log('[THREAD_WORKFLOW] Unsupported provider:', providerId);
      return yield* Effect.fail({
        _tag: 'UnsupportedProvider' as const,
        providerId,
      });
    }
  }).pipe(
    Effect.tapError((error) => Console.log('[THREAD_WORKFLOW] Error in workflow:', error)),
    Effect.catchAll((error) => {
      // Clean up thread processing flag on error
      return Effect.tryPromise({
        try: () => {
          console.log(
            '[THREAD_WORKFLOW] Clearing processing flag for thread after error:',
            params.threadId,
          );
          return env.gmail_processing_threads.delete(params.threadId.toString());
        },
        catch: () => ({
          _tag: 'DatabaseError' as const,
          error: 'Failed to cleanup thread processing flag',
        }),
      }).pipe(
        Effect.orElse(() => Effect.succeed(null)),
        Effect.flatMap(() => Effect.fail(error)),
      );
    }),
    Effect.provide(loggerLayer),
  );

export const getPrompt = async (promptName: string, fallback: string) => {
  try {
    if (!promptName || typeof promptName !== 'string') {
      log('[GET_PROMPT] Invalid prompt name:', promptName);
      return fallback;
    }

    const existingPrompt = await env.prompts_storage.get(promptName);
    if (!existingPrompt) {
      await env.prompts_storage.put(promptName, fallback);
      return fallback;
    }
    return existingPrompt;
  } catch (error) {
    log('[GET_PROMPT] Failed to get prompt:', {
      promptName,
      error: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  }
};

export const getEmbeddingVector = async (text: string) => {
  try {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      log('[getEmbeddingVector] Empty or invalid text provided');
      return null;
    }

    const embeddingResponse = await env.AI.run(
      '@cf/baai/bge-large-en-v1.5',
      { text: text.trim() },
      {
        gateway: {
          id: 'vectorize-save',
        },
      },
    );
    const embeddingVector = (embeddingResponse as any).data?.[0];
    return embeddingVector ?? null;
  } catch (error) {
    log('[getEmbeddingVector] failed', error);
    return null;
  }
};
