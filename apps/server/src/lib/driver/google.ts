import {
  deleteActiveConnection,
  FatalErrors,
  findHtmlBody,
  fromBase64Url,
  fromBinary,
  getSimpleLoginSender,
  sanitizeContext,
  StandardizedError,
} from './utils';
import { mapGoogleLabelColor, mapToGoogleLabelColor } from './google-label-color-map';
import { parseAddressList, parseFrom, wasSentWithTLS } from '../email-utils';
import type { IOutgoingMessage, Label, ParsedMessage } from '../../types';
import { sanitizeTipTapHtml } from '../sanitize-tip-tap-html';
import type { MailManager, ManagerConfig } from './types';
import { OAuth2Client } from 'google-auth-library';
import type { CreateDraftData } from '../schemas';
import { createMimeMessage } from 'mimetext';
import { cleanSearchValue } from '../utils';
import { env } from 'cloudflare:workers';
import { Effect } from 'effect';
import * as he from 'he';

// Lazy load heavy imports
let gmailApi: typeof import('@googleapis/gmail') | undefined;
let peopleApi: typeof import('@googleapis/people') | undefined;

async function getGmail() {
  if (!gmailApi) gmailApi = await import('@googleapis/gmail');
  return gmailApi.gmail;
}

async function getPeople() {
  if (!peopleApi) peopleApi = await import('@googleapis/people');
  return peopleApi.people;
}

export class GoogleMailManager implements MailManager {
  private auth;
  private gmail;

  private labelIdCache: Record<string, string> = {};

  private readonly systemLabelIds = new Set<string>([
    'INBOX',
    'TRASH',
    'SPAM',
    'DRAFT',
    'SENT',
    'STARRED',
    'UNREAD',
    'IMPORTANT',
    'CATEGORY_PERSONAL',
    'CATEGORY_SOCIAL',
    'CATEGORY_UPDATES',
    'CATEGORY_FORUMS',
    'CATEGORY_PROMOTIONS',
    'MUTED',
  ]);

  constructor(public config: ManagerConfig) {
    this.auth = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);

    if (config.auth)
      this.auth.setCredentials({
        refresh_token: config.auth.refreshToken,
        scope: this.getScope(),
      });

    // Initialize gmail lazily
    this.gmail = null as any;
  }

  private async getGmailInstance() {
    if (!this.gmail) {
      const gmailModule = await getGmail();
      this.gmail = gmailModule({ version: 'v1', auth: this.auth });
    }
    return this.gmail;
  }
  public getScope(): string {
    return [
      'https://mail.google.com/',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' ');
  }
  public async listHistory<T>(historyId: string): Promise<{ history: T[]; historyId: string }> {
    return this.withErrorHandler(
      'listHistory',
      async () => {
        const gmail = await this.getGmailInstance();
        const response = await gmail.users.history.list({
          userId: 'me',
          startHistoryId: historyId,
        });

        const history = response.data.history || [];
        const nextHistoryId = response.data.historyId || historyId;

        return { history: history as T[], historyId: nextHistoryId };
      },
      { historyId },
    );
  }
  public async getAttachment(messageId: string, attachmentId: string) {
    return this.withErrorHandler(
      'getAttachment',
      async () => {
        const gmail = await this.getGmailInstance();
        const response = await gmail.users.messages.attachments.get({
          userId: 'me',
          messageId,
          id: attachmentId,
        });

        const attachmentData = response.data.data || '';

        const base64 = fromBase64Url(attachmentData);

        return base64;
      },
      { messageId, attachmentId },
    );
  }

  public async getMessageAttachments(messageId: string) {
    return this.withErrorHandler(
      'getMessageAttachments',
      async () => {
        const gmail = await this.getGmailInstance();
        const res = await gmail.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'full',
        });

        const message = res.data;
        if (!message.payload) {
          return [];
        }

        const attachments: Array<{
          id: string;
          filename: string;
          mimeType: string;
          size: number;
          data: Uint8Array;
        }> = [];

        const processParts = async (parts: any[]) => {
          for (const part of parts) {
            if (part.filename && part.body?.attachmentId) {
              const attachment = await this.getAttachment(messageId, part.body.attachmentId);
              attachments.push({
                id: part.body.attachmentId,
                filename: part.filename,
                mimeType: part.mimeType || 'application/octet-stream',
                size: part.body.size || 0,
                data: attachment,
              });
            }
            if (part.parts) {
              await processParts(part.parts);
            }
          }
        };

        if (message.payload.parts) {
          await processParts(message.payload.parts);
        } else if (message.payload.filename && message.payload.body?.attachmentId) {
          const attachment = await this.getAttachment(messageId, message.payload.body.attachmentId);
          attachments.push({
            id: message.payload.body.attachmentId,
            filename: message.payload.filename,
            mimeType: message.payload.mimeType || 'application/octet-stream',
            size: message.payload.body.size || 0,
            data: attachment,
          });
        }

        return attachments;
      },
      { messageId },
    );
  }
  public getEmailAliases() {
    return this.withErrorHandler(
      'getEmailAliases',
      async () => {
        const gmail = await this.getGmailInstance();
        const profile = await gmail.users.getProfile({
          userId: 'me',
        });

        const settings = await gmail.users.settings.sendAs.list({
          userId: 'me',
        });

        const aliases = settings.data.sendAs || [];
        const primaryEmail = profile.data.emailAddress || '';

        return [primaryEmail, ...aliases.map((alias) => alias.sendAsEmail || '')].filter(Boolean);
      },
    );
  }
  public markAsRead(threadIds: string[]) {
    return this.withErrorHandler(
      'markAsRead',
      async () => {
        const finalIds = (
          await Promise.all(
            threadIds.map(async (id) => {
              const threadMetadata = await this.getThreadMetadata(id);
              return threadMetadata.messages
                .filter((msg) => msg.labelIds && msg.labelIds.includes('UNREAD'))
                .map((msg) => msg.id);
            }),
          ).then((idArrays) => [...new Set(idArrays.flat())])
        ).filter((id): id is string => id !== undefined);

        await this.modifyThreadLabels(finalIds, { removeLabelIds: ['UNREAD'] });
      },
      { threadIds },
    );
  }
  public markAsUnread(threadIds: string[]) {
    return this.withErrorHandler(
      'markAsUnread',
      async () => {
        const finalIds = (
          await Promise.all(
            threadIds.map(async (id) => {
              const threadMetadata = await this.getThreadMetadata(id);
              return threadMetadata.messages
                .filter((msg) => msg.labelIds && !msg.labelIds.includes('UNREAD'))
                .map((msg) => msg.id);
            }),
          ).then((idArrays) => [...new Set(idArrays.flat())])
        ).filter((id): id is string => id !== undefined);
        await this.modifyThreadLabels(finalIds, { addLabelIds: ['UNREAD'] });
      },
      { threadIds },
    );
  }
  public getUserInfo() {
    return this.withErrorHandler(
      'getUserInfo',
      async () => {
        const res = await getPeople().then((people) =>
          people.people.get({
            resourceName: 'people/me',
            personFields: 'names,photos,emailAddresses',
          }),
        );
        return {
          address: res.data.emailAddresses?.[0]?.value ?? '',
          name: res.data.names?.[0]?.displayName ?? '',
          photo: res.data.photos?.[0]?.url ?? '',
        };
      },
      {},
    );
  }
  public getTokens<T>(code: string) {
    return this.withErrorHandler(
      'getTokens',
      async () => {
        const { tokens } = await this.auth.getToken(code);
        return { tokens } as T;
      },
      { code },
    );
  }
  public count() {
    return this.withErrorHandler(
      'count',
      async () => {
        type LabelCount = { label: string; count: number };

        const getUserLabelsEffect = Effect.tryPromise({
          try: () => getGmail().then((gmail) => gmail.users.labels.list({ userId: 'me' })),
          catch: (error) => ({ _tag: 'LabelListFailed' as const, error }),
        });

        const getArchiveCountEffect = Effect.tryPromise({
          try: () =>
            getGmail().then((gmail) =>
              gmail.users.threads.list({
                userId: 'me',
                q: 'in:archive',
                maxResults: 1,
              }),
            ),
          catch: (error) => ({ _tag: 'ArchiveFetchFailed' as const, error }),
        });

        const processLabelEffect = (label: any) =>
          Effect.tryPromise({
            try: () =>
              getGmail().then((gmail) =>
                gmail.users.labels.get({
                  userId: 'me',
                  id: label.id ?? undefined,
                }),
              ),
            catch: (error) => ({ _tag: 'LabelFetchFailed' as const, error, labelId: label.id }),
          }).pipe(
            Effect.map((res) => {
              if ('_tag' in res) return null;

              let labelName = (res.data.name ?? res.data.id ?? '').toLowerCase();
              if (labelName === 'draft') {
                labelName = 'drafts';
              }
              const isTotalLabel = labelName === 'drafts' || labelName === 'sent';
              return {
                label: labelName,
                count: Number(isTotalLabel ? res.data.threadsTotal : res.data.threadsUnread),
              };
            }),
          );

        const mainEffect = Effect.gen(function* () {
          // Fetch user labels and archive count concurrently
          const [userLabelsResult, archiveResult] = yield* Effect.all(
            [getUserLabelsEffect, getArchiveCountEffect],
            { concurrency: 'unbounded' },
          );

          // Handle label list failure
          if ('_tag' in userLabelsResult && userLabelsResult._tag === 'LabelListFailed') {
            return [];
          }

          const labels = userLabelsResult.data.labels || [];
          if (labels.length === 0) {
            return [];
          }

          // Process all labels concurrently
          const labelEffects = labels.map(processLabelEffect);
          const labelResults = yield* Effect.all(labelEffects, { concurrency: 'unbounded' });

          // Filter and collect results
          const mapped: LabelCount[] = labelResults.filter(
            (item): item is LabelCount => item !== null,
          );

          // Add archive count if successful
          if (!('_tag' in archiveResult)) {
            mapped.push({
              label: 'archive',
              count: Number(archiveResult.data.resultSizeEstimate ?? 0),
            });
          }

          return mapped;
        });

        return await Effect.runPromise(mainEffect);
      },
      { email: this.config.auth?.email },
    );
  }

  private getQuotaUser() {
    return this.config.auth?.email ? `${this.config.auth.email}-${env.NODE_ENV}` : undefined;
  }
  public list(params: {
    folder: string;
    query?: string;
    maxResults?: number;
    labelIds?: string[];
    pageToken?: string;
  }) {
    return this.withErrorHandler(
      'list',
      async () => {
        const gmail = await this.getGmailInstance();
        const res = await gmail.users.threads.list({
          userId: 'me',
          q: this.normalizeSearch(params.folder, params.query || ''),
          maxResults: params.maxResults || 20,
          pageToken: params.pageToken,
          labelIds: params.labelIds,
        });

        const threads = res.data.threads || [];
        const nextPageToken = res.data.nextPageToken;

        return {
          threads: threads.map((thread) => ({
            id: thread.id || '',
            snippet: thread.snippet || '',
            historyId: thread.historyId || '',
          })),
          nextPageToken,
        };
      },
      params,
    );
  }
  public get(id: string) {
    return this.withErrorHandler(
      'get',
      async () => {
        const gmail = await this.getGmailInstance();
        const res = await gmail.users.threads.get({
          userId: 'me',
          id,
          format: 'full',
        });

        const thread = res.data;
        if (!thread.messages) {
          throw new Error('No messages in thread');
        }

        const messages = thread.messages.map((message) => this.parse(message));
        const lastMessage = messages[messages.length - 1];

        return {
          id: thread.id || '',
          historyId: thread.historyId || '',
          messages,
          snippet: thread.snippet || '',
          labelIds: lastMessage.labelIds,
        };
      },
      { id },
    );
  }
  public create(data: IOutgoingMessage) {
    return this.withErrorHandler(
      'create',
      async () => {
        const gmail = await this.getGmailInstance();
        const res = await gmail.users.messages.send({
          userId: 'me',
          requestBody: await this.parseOutgoing(data),
        });

        return res.data;
      },
      data,
    );
  }
  public delete(id: string) {
    return this.withErrorHandler(
      'delete',
      async () => {
        const gmail = await this.getGmailInstance();
        const res = await gmail.users.messages.delete({ userId: 'me', id });
        return res.data;
      },
      { id },
    );
  }
  public normalizeIds(ids: string[]) {
    return this.withSyncErrorHandler(
      'normalizeIds',
      () => {
        const threadIds: string[] = ids.map((id) =>
          id.startsWith('thread:') ? id.substring(7) : id,
        );
        return { threadIds };
      },
      { ids },
    );
  }
  public modifyLabels(
    threadIds: string[],
    addOrOptions: { addLabels: string[]; removeLabels: string[] } | string[],
    maybeRemove?: string[],
  ) {
    const options = Array.isArray(addOrOptions)
      ? { addLabels: addOrOptions as string[], removeLabels: maybeRemove ?? [] }
      : addOrOptions;
    return this.withErrorHandler(
      'modifyLabels',
      async () => {
        const addLabelIds = await Promise.all(
          (options.addLabels || []).map((lbl) => this.resolveLabelId(lbl)),
        );
        const removeLabelIds = await Promise.all(
          (options.removeLabels || []).map((lbl) => this.resolveLabelId(lbl)),
        );

        await this.modifyThreadLabels(threadIds, {
          addLabelIds,
          removeLabelIds,
        });
      },
      { threadIds, options },
    );
  }
  public sendDraft(draftId: string, data: IOutgoingMessage) {
    return this.withErrorHandler(
      'sendDraft',
      async () => {
        const gmail = await this.getGmailInstance();
        await gmail.users.drafts.send({
          userId: 'me',
          requestBody: {
            id: draftId,
          },
        });

        return this.create(data);
      },
      { draftId, data },
    );
  }
  public getDraft(draftId: string) {
    return this.withErrorHandler(
      'getDraft',
      async () => {
        const gmail = await this.getGmailInstance();
        const res = await gmail.users.drafts.get({
          userId: 'me',
          id: draftId,
        });

        const draft = res.data;
        if (!draft.message) {
          throw new Error('No message in draft');
        }

        return this.parseDraft(draft);
      },
      { draftId },
    );
  }
  public listDrafts(params: { q?: string; maxResults?: number; pageToken?: string }) {
    return this.withErrorHandler(
      'listDrafts',
      async () => {
        const gmail = await this.getGmailInstance();
        const res = await gmail.users.drafts.list({
          userId: 'me',
          q: params.q,
          maxResults: params.maxResults || 20,
          pageToken: params.pageToken,
        });

        const drafts = res.data.drafts || [];
        const nextPageToken = res.data.nextPageToken;

        const draftDetails = await Promise.all(
          drafts.map(async (draft) => {
            const msg = await gmail.users.drafts.get({
              userId: 'me',
              id: draft.id || '',
            });
            return this.parseDraft(msg.data);
          }),
        );

        return {
          drafts: draftDetails,
          nextPageToken,
        };
      },
      params,
    );
  }
  public createDraft(data: CreateDraftData) {
    return this.withErrorHandler(
      'createDraft',
      async () => {
        const gmail = await this.getGmailInstance();
        const message = await this.parseOutgoing(data);

        let res;
        if (data.id) {
          res = await gmail.users.drafts.update({
            userId: 'me',
            id: data.id,
            requestBody: {
              message,
            },
          });
        } else {
          res = await gmail.users.drafts.create({
            userId: 'me',
            requestBody: {
              message,
            },
          });
        }

        return this.parseDraft(res.data);
      },
      data,
    );
  }
  public async getUserLabels() {
    const res = await getGmail().then((gmail) =>
      gmail.users.labels.list({
        userId: 'me',
      }),
    );
    // wtf google, null values for EVERYTHING?
    return (
      res.data.labels?.map((label) => ({
        id: label.id ?? '',
        name: label.name ?? '',
        type: label.type ?? '',
        color: mapGoogleLabelColor({
          backgroundColor: label.color?.backgroundColor ?? '',
          textColor: label.color?.textColor ?? '',
        }),
      })) ?? []
    );
  }
  public async getLabel(labelId: string): Promise<Label> {
    const res = await getGmail().then((gmail) =>
      gmail.users.labels.get({
        userId: 'me',
        id: labelId,
      }),
    );
    return {
      id: labelId,
      name: res.data.name ?? '',
      color: mapGoogleLabelColor({
        backgroundColor: res.data.color?.backgroundColor ?? '',
        textColor: res.data.color?.textColor ?? '',
      }),
      type: res.data.type ?? 'user',
    };
  }
  public async createLabel(label: {
    name: string;
    color?: { backgroundColor: string; textColor: string };
  }) {
    await getGmail().then((gmail) =>
      gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name: label.name,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show',
          color: label.color
            ? mapToGoogleLabelColor({
                backgroundColor: label.color.backgroundColor,
                textColor: label.color.textColor,
              })
            : undefined,
        },
      }),
    );
  }
  public async updateLabel(id: string, label: Label) {
    await getGmail().then((gmail) =>
      gmail.users.labels.update({
        userId: 'me',
        id: id,
        requestBody: {
          name: label.name,
          color: label.color
            ? mapToGoogleLabelColor({
                backgroundColor: label.color.backgroundColor,
                textColor: label.color.textColor,
              })
            : undefined,
        },
      }),
    );
  }
  public async deleteLabel(id: string) {
    await getGmail().then((gmail) =>
      gmail.users.labels.delete({
        userId: 'me',
        id: id,
      }),
    );
  }
  public async revokeToken(token: string) {
    if (!token) return false;
    try {
      await this.auth.revokeToken(token);
      return true;
    } catch (error: unknown) {
      console.error('Failed to revoke Google token:', (error as Error).message);
      return false;
    }
  }

  public deleteAllSpam() {
    return this.withErrorHandler(
      'deleteAllSpam',
      async () => {
        let totalDeleted = 0;
        let hasMoreSpam = true;
        let pageToken: string | number | null | undefined = undefined;

        while (hasMoreSpam) {
          const spamThreads = await this.list({
            folder: 'spam',
            maxResults: 500,
            pageToken: pageToken as string | undefined,
          });

          if (!spamThreads.threads || spamThreads.threads.length === 0) {
            hasMoreSpam = false;
            break;
          }

          const threadIds = spamThreads.threads.map((thread) => thread.id);
          await this.modifyLabels(threadIds, {
            addLabels: ['TRASH'],
            removeLabels: ['SPAM', 'INBOX'],
          });

          totalDeleted += threadIds.length;
          pageToken = spamThreads.nextPageToken;

          if (!pageToken) {
            hasMoreSpam = false;
          }
        }

        return {
          success: true,
          message: `Deleted ${totalDeleted} spam emails`,
          count: totalDeleted,
        };
      },
      { email: this.config.auth?.email },
    );
  }

  private async getThreadMetadata(threadId: string) {
    return this.withErrorHandler(
      'getThreadMetadata',
      async () => {
        const gmail = await this.getGmailInstance();
        const res = await gmail.users.threads.get({
          userId: 'me',
          id: threadId,
          format: 'metadata', // Fetch only metadata,
          quotaUser: this.getQuotaUser(),
        });
        // Process res.data.messages to extract id and labelIds
        return {
          messages:
            res.data.messages?.map((msg) => ({
              id: msg.id,
              labelIds: msg.labelIds,
            })) || [],
        };
      },
      { threadId, email: this.config.auth?.email },
    );
  }

  private async modifyThreadLabels(
    threadIds: string[],
    requestBody: any, // Changed from gmail_v1.Schema$ModifyThreadRequest to any for now
  ) {
    if (threadIds.length === 0) {
      return;
    }

    const chunkSize = 15;
    const delayBetweenChunks = 100;
    const allResults: Array<{
      threadId: string;
      status: 'fulfilled' | 'rejected';
      value?: unknown;
      reason?: unknown;
    }> = [];

    for (let i = 0; i < threadIds.length; i += chunkSize) {
      const chunk = threadIds.slice(i, i + chunkSize);

      const effects = chunk.map((threadId) =>
        Effect.tryPromise({
          try: async () => {
            const gmail = await this.getGmailInstance();
            const response = await gmail.users.threads.modify({
              userId: 'me',
              id: threadId,
              requestBody,
            });
            return { threadId, status: 'fulfilled' as const, value: response.data };
          },
          catch: (error: any) => {
            const errorMessage = error?.errors?.[0]?.message || error.message || error;
            return { threadId, status: 'rejected' as const, reason: { error: errorMessage } };
          },
        }),
      );

      const chunkResults = await Effect.runPromise(
        Effect.all(effects, { concurrency: 'unbounded' }),
      );
      allResults.push(...chunkResults);

      if (i + chunkSize < threadIds.length) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenChunks));
      }
    }

    const failures = allResults.filter((result) => result.status === 'rejected');
    if (failures.length > 0) {
      const failureReasons = failures.map((f) => ({ threadId: f.threadId, reason: f.reason }));
      const first = failureReasons[0];
      throw new Error(
        `Failed to modify labels for thread ${first.threadId}: ${JSON.stringify(first.reason)}`,
      );
    }
  }
  private normalizeSearch(folder: string, q: string) {
    if (folder !== 'inbox') {
      q = cleanSearchValue(q);

      if (folder === 'bin') {
        return { folder: undefined, q: `in:trash ${q}` };
      }
      if (folder === 'archive') {
        return { folder: undefined, q: `in:archive AND (${q})` };
      }
      if (folder === 'draft') {
        return { folder: undefined, q: `is:draft AND (${q})` };
      }

      if (folder === 'snoozed') {
        return { folder: undefined, q: `label:Snoozed AND (${q})` };
      }

      return { folder, q: folder.trim().length ? `in:${folder} ${q}` : q };
    }

    return { folder, q };
  }
  private parse({
    id,
    threadId,
    snippet,
    labelIds,
    payload,
  }: gmail_v1.Schema$Message): Omit<
    ParsedMessage,
    'body' | 'processedHtml' | 'blobUrl' | 'totalReplies'
  > {
    const receivedOn =
      payload?.headers?.find((h) => h.name?.toLowerCase() === 'date')?.value || 'Failed';

    // If there's a SimpleLogin Header, use it as the sender
    const simpleLoginSender = getSimpleLoginSender(payload);

    const sender =
      simpleLoginSender ||
      payload?.headers?.find((h) => h.name?.toLowerCase() === 'from')?.value ||
      'Failed';
    const subject = payload?.headers?.find((h) => h.name?.toLowerCase() === 'subject')?.value || '';
    const references =
      payload?.headers?.find((h) => h.name?.toLowerCase() === 'references')?.value || '';
    const inReplyTo =
      payload?.headers?.find((h) => h.name?.toLowerCase() === 'in-reply-to')?.value || '';
    const messageId =
      payload?.headers?.find((h) => h.name?.toLowerCase() === 'message-id')?.value || '';
    const listUnsubscribe =
      payload?.headers?.find((h) => h.name?.toLowerCase() === 'list-unsubscribe')?.value ||
      undefined;
    const listUnsubscribePost =
      payload?.headers?.find((h) => h.name?.toLowerCase() === 'list-unsubscribe-post')?.value ||
      undefined;
    const replyTo =
      payload?.headers?.find((h) => h.name?.toLowerCase() === 'reply-to')?.value || undefined;
    const toHeaders =
      payload?.headers
        ?.filter((h) => h.name?.toLowerCase() === 'to')
        .map((h) => h.value)
        .filter((v) => typeof v === 'string') || [];
    const to = toHeaders.flatMap((to) => parseAddressList(to));

    const ccHeaders =
      payload?.headers
        ?.filter((h) => h.name?.toLowerCase() === 'cc')
        .map((h) => h.value)
        .filter((v) => typeof v === 'string') || [];

    const cc =
      ccHeaders.length > 0
        ? ccHeaders
            .filter((header) => header.trim().length > 0)
            .flatMap((header) => parseAddressList(header))
        : null;

    const receivedHeaders =
      payload?.headers
        ?.filter((header) => header.name?.toLowerCase() === 'received')
        .map((header) => header.value || '') || [];
    const hasTLSReport = payload?.headers?.some(
      (header) => header.name?.toLowerCase() === 'tls-report',
    );

    return {
      id: id || 'ERROR',
      bcc: [],
      threadId: threadId || '',
      title: snippet ? he.decode(snippet).trim() : 'ERROR',
      tls: wasSentWithTLS(receivedHeaders) || !!hasTLSReport,
      tags: labelIds?.map((l) => ({ id: l, name: l, type: 'user' })) || [],
      listUnsubscribe,
      listUnsubscribePost,
      replyTo,
      references,
      inReplyTo,
      sender: parseFrom(sender),
      unread: labelIds ? labelIds.includes('UNREAD') : false,
      to,
      cc,
      receivedOn,
      subject: subject ? subject.replace(/"/g, '').trim() : '(no subject)',
      messageId,
      isDraft: labelIds ? labelIds.includes('DRAFT') : false,
    };
  }
  private async parseOutgoing({
    to,
    subject,
    message,
    attachments,
    headers,
    cc,
    bcc,
    fromEmail,
    originalMessage = null,
  }: IOutgoingMessage) {
    const msg = createMimeMessage();

    const defaultFromEmail = this.config.auth?.email || 'nobody@example.com';
    const senderEmail = fromEmail || defaultFromEmail;

    msg.setSender(`${fromEmail}`);

    const uniqueRecipients = new Set<string>();

    if (!Array.isArray(to)) {
      throw new Error('Recipient address required');
    }

    if (to.length === 0) {
      throw new Error('Recipient address required');
    }

    const toRecipients = to
      .filter((recipient) => {
        if (!recipient || !recipient.email) {
          return false;
        }

        const email = recipient.email.toLowerCase();

        if (!uniqueRecipients.has(email)) {
          uniqueRecipients.add(email);
          return true;
        }
        return false;
      })
      .map((recipient) => {
        const emailMatch = recipient.email.match(/<([^>]+)>/);
        const email = emailMatch ? emailMatch[1] : recipient.email;
        if (!email) {
          throw new Error('Invalid email address');
        }
        return {
          name: recipient.name || '',
          addr: email,
        };
      });

    if (toRecipients.length > 0) {
      msg.setRecipients(toRecipients);
    } else {
      throw new Error('No valid recipients found in To field');
    }

    if (Array.isArray(cc) && cc.length > 0) {
      const ccRecipients = cc
        .filter((recipient) => {
          const email = recipient.email.toLowerCase();
          if (!uniqueRecipients.has(email) && email !== senderEmail) {
            uniqueRecipients.add(email);
            return true;
          }
          return false;
        })
        .map((recipient) => ({
          name: recipient.name || '',
          addr: recipient.email,
        }));

      if (ccRecipients.length > 0) {
        msg.setCc(ccRecipients);
      }
    }

    if (Array.isArray(bcc) && bcc.length > 0) {
      const bccRecipients = bcc
        .filter((recipient) => {
          const email = recipient.email.toLowerCase();
          if (!uniqueRecipients.has(email) && email !== senderEmail) {
            uniqueRecipients.add(email);
            return true;
          }
          return false;
        })
        .map((recipient) => ({
          name: recipient.name || '',
          addr: recipient.email,
        }));

      if (bccRecipients.length > 0) {
        msg.setBcc(bccRecipients);
      }
    }

    msg.setSubject(subject);

    const { html: processedMessage, inlineImages } = await sanitizeTipTapHtml(message.trim());

    if (originalMessage) {
      msg.addMessage({
        contentType: 'text/html',
        data: `${processedMessage}${originalMessage}`,
      });
    } else {
      msg.addMessage({
        contentType: 'text/html',
        data: processedMessage,
      });
    }

    if (inlineImages.length > 0) {
      for (const image of inlineImages) {
        msg.addAttachment({
          inline: true,
          filename: `${image.cid}`,
          contentType: image.mimeType,
          data: image.data,
          headers: {
            'Content-ID': `<${image.cid}>`,
            'Content-Disposition': 'inline',
          },
        });
      }
    }

    if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        if (value) {
          if (key.toLowerCase() === 'references' && value) {
            const refs = value
              .split(' ')
              .filter(Boolean)
              .map((ref) => {
                if (!ref.startsWith('<')) ref = `<${ref}`;
                if (!ref.endsWith('>')) ref = `${ref}>`;
                return ref;
              });
            msg.setHeader(key, refs.join(' '));
          } else {
            msg.setHeader(key, value);
          }
        }
      });
    }

    if (attachments?.length > 0) {
      for (const file of attachments) {
        const base64Content = file.base64;

        msg.addAttachment({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          data: base64Content,
        });
      }
    }

    const emailContent = msg.asRaw();
    const encodedMessage = Buffer.from(emailContent).toString('base64');

    return {
      raw: encodedMessage,
    };
  }

  private async parseDraft(draft: gmail_v1.Schema$Draft) {
    if (!draft.message) return null;

    const headers = draft.message.payload?.headers || [];
    const to =
      headers
        .find((h) => h.name === 'To')
        ?.value?.split(',')
        .map((e) => e.trim())
        .filter(Boolean) || [];

    const subject = headers.find((h) => h.name === 'Subject')?.value;

    const cc =
      draft.message.payload?.headers?.find((h) => h.name === 'Cc')?.value?.split(',') || [];
    const bcc =
      draft.message.payload?.headers?.find((h) => h.name === 'Bcc')?.value?.split(',') || [];

    const payload = draft.message.payload;
    let content = '';
    let attachments: {
      filename: string;
      mimeType: string;
      size: number;
      attachmentId: string;
      headers: { name: string; value: string }[];
      body: string;
    }[] = [];

    if (payload?.parts) {
      //  Get body
      const htmlPart = payload.parts.find((part) => part.mimeType === 'text/html');
      if (htmlPart?.body?.data) {
        content = fromBinary(htmlPart.body.data);
      }

      //  Get attachments
      const attachmentParts = payload.parts.filter(
        (part) => !!part.filename && !!part.body?.attachmentId,
      );

      attachments = await Promise.all(
        attachmentParts.map(async (part) => {
          try {
            const attachmentData = await this.getAttachment(
              draft.message!.id!,
              part.body!.attachmentId!,
            );
            return {
              filename: part.filename || '',
              mimeType: part.mimeType || '',
              size: Number(part.body?.size || 0),
              attachmentId: part.body!.attachmentId!,
              headers:
                part.headers?.map((h) => ({
                  name: h.name ?? '',
                  value: h.value ?? '',
                })) ?? [],
              body: attachmentData ?? '',
            };
          } catch (e) {
            console.error('Failed to get attachment', e);
            return null;
          }
        }),
      ).then((a) => a.filter((a): a is NonNullable<typeof a> => a !== null));
    } else if (payload?.body?.data) {
      content = fromBinary(payload.body.data);
    }

    return {
      id: draft.id || '',
      to,
      subject: subject ? he.decode(subject).trim() : '',
      content,
      rawMessage: draft.message,
      cc,
      bcc,
      attachments,
    };
  }

  private async withErrorHandler<T>(
    operation: string,
    fn: () => Promise<T> | T,
    context?: Record<string, unknown>,
  ): Promise<T> {
    try {
      return await Promise.resolve(fn());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      const isFatal = FatalErrors.includes(error.message);
      console.error(
        `[${isFatal ? 'FATAL_ERROR' : 'ERROR'}] [Gmail Driver] Operation: ${operation}`,
        {
          error: error.message,
          code: error.code,
          context: sanitizeContext(context),
          stack: error.stack,
          isFatal,
        },
      );
      if (isFatal) await deleteActiveConnection();
      throw new StandardizedError(error, operation, context);
    }
  }
  private withSyncErrorHandler<T>(
    operation: string,
    fn: () => T,
    context?: Record<string, unknown>,
  ): T {
    try {
      return fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      const isFatal = FatalErrors.includes(error.message);
      console.error(`[Gmail Driver Error] Operation: ${operation}`, {
        error: error.message,
        code: error.code,
        context: sanitizeContext(context),
        stack: error.stack,
        isFatal,
      });
      if (isFatal) void deleteActiveConnection();
      throw new StandardizedError(error, operation, context);
    }
  }

  private findAttachments(parts: gmail_v1.Schema$MessagePart[]): gmail_v1.Schema$MessagePart[] {
    let results: gmail_v1.Schema$MessagePart[] = [];

    for (const part of parts) {
      if (part.filename && part.filename.length > 0) {
        const contentDisposition =
          part.headers?.find((h) => h.name?.toLowerCase() === 'content-disposition')?.value || '';
        const isInline = contentDisposition.toLowerCase().includes('inline');
        const hasContentId = part.headers?.some((h) => h.name?.toLowerCase() === 'content-id');

        if (!isInline || (isInline && !hasContentId)) {
          results.push(part);
        }
      }

      if (part.parts && Array.isArray(part.parts)) {
        results = results.concat(this.findAttachments(part.parts));
      }

      if (part.body?.attachmentId && part.mimeType === 'message/rfc822') {
        if (part.filename && part.filename.length > 0) {
          results.push(part);
        }
      }
    }

    return results;
  }

  private async resolveLabelId(labelName: string): Promise<string> {
    if (this.systemLabelIds.has(labelName)) {
      return labelName;
    }

    if (this.labelIdCache[labelName]) {
      return this.labelIdCache[labelName];
    }

    const userLabels = await this.getUserLabels();
    const existing = userLabels.find((l) => l.name?.toLowerCase() === labelName.toLowerCase());
    if (existing && existing.id) {
      this.labelIdCache[labelName] = existing.id;
      return existing.id;
    }
    const prettifiedName = labelName.charAt(0).toUpperCase() + labelName.slice(1).toLowerCase();
    await this.createLabel({ name: prettifiedName });

    const refreshedLabels = await this.getUserLabels();
    const created = refreshedLabels.find(
      (l) => l.name?.toLowerCase() === prettifiedName.toLowerCase(),
    );
    if (!created || !created.id) {
      throw new Error(`Failed to create or retrieve Gmail label '${labelName}'.`);
    }

    this.labelIdCache[labelName] = created.id;
    return created.id;
  }
}
