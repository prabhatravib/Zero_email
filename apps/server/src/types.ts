import { type Context } from 'hono';
import { type DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from './db/schema';
import { z } from 'zod';

export interface Env {
  // Database
  DATABASE_URL: string;
  
  // AI
  AI: any;
  
  // Vectorize
  VECTORIZE: any;
  VECTORIZE_MESSAGE: any;
  
  // R2 Buckets
  THREADS_BUCKET: any;
  
  // Durable Objects
  ZERO_AGENT: any;
  ZERO_MCP: any;
  ZERO_DB: any;
  ZERO_DRIVER: any;
  THINKING_MCP: any;
  
  // Queues
  thread_queue: any;
  subscribe_queue: any;
  
  // KV Namespaces
  gmail_history_id: any;
  gmail_processing_threads: any;
  subscribed_accounts: any;
  connection_labels: any;
  prompts_storage: any;
  gmail_sub_age: any;
  snoozed_emails: any;
  
  // Environment Variables
  NODE_ENV: string;
  COOKIE_DOMAIN: string;
  VITE_PUBLIC_BACKEND_URL: string;
  VITE_PUBLIC_APP_URL: string;
  JWT_SECRET: string;
  ELEVENLABS_API_KEY: string;
  DISABLE_CALLS: string;
  VOICE_SECRET: string;
  GOOGLE_S_ACCOUNT: string;
  DROP_AGENT_TABLES: string;
  THREAD_SYNC_MAX_COUNT: string;
  THREAD_SYNC_LOOP: string;
  DISABLE_WORKFLOWS: string;
  AUTORAG_ID: string;
  USE_OPENAI: string;
  AUTUMN_SECRET_KEY: string;
}

export type DB = DrizzleD1Database<typeof schema>;

export enum EProviders {
  'google' = 'google',
  'microsoft' = 'microsoft',
}

export interface ISubscribeBatch {
  connectionId: string;
  providerId: EProviders;
}

export interface IThreadBatch {
  providerId: EProviders;
  historyId: string;
  subscriptionName: string;
}

// Batch payload for unsnoozing threads via the queue
export interface ISnoozeBatch {
  connectionId: string;
  threadIds: string[];
  keyNames: string[];
}

export const defaultLabels = [
  {
    name: 'to respond',
    usecase: 'emails you need to respond to. NOT sales, marketing, or promotions.',
  },
  {
    name: 'FYI',
    usecase:
      'emails that are not important, but you should know about. NOT sales, marketing, or promotions.',
  },
  {
    name: 'comment',
    usecase:
      'Team chats in tools like Google Docs, Slack, etc. NOT marketing, sales, or promotions.',
  },
  {
    name: 'notification',
    usecase: 'Automated updates from services you use. NOT sales, marketing, or promotions.',
  },
  {
    name: 'promotion',
    usecase: 'Sales, marketing, cold emails, special offers or promotions. NOT to respond to.',
  },
  {
    name: 'meeting',
    usecase: 'Calendar events, invites, etc. NOT sales, marketing, or promotions.',
  },
  {
    name: 'billing',
    usecase: 'Billing notifications. NOT sales, marketing, or promotions.',
  },
];

export type Label = {
  id: string;
  name: string;
  color?: {
    backgroundColor: string;
    textColor: string;
  };
  type: string;
  labels?: Label[];
  count?: number;
};

export interface User {
  name: string;
  email: string;
  avatar: string;
}

export interface ISendEmail {
  to: Sender[];
  subject: string;
  message: string;
  attachments?: File[];
  headers?: Record<string, string>;
  cc?: Sender[];
  bcc?: Sender[];
  threadId?: string;
  fromEmail?: string;
}

export interface Account {
  name: string;
  email: string;
}

export interface NavItem {
  title: string;
  url: string;
  isActive?: boolean;
  badge?: number;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface SidebarData {
  user: User;
  accounts: Account[];
  navMain: NavSection[];
}

export interface Sender {
  name?: string;
  email: string;
}

export const ParsedMessageSchema = z.object({
  id: z.string(),
  connectionId: z.string().optional(),
  title: z.string(),
  subject: z.string(),
  tags: z.array(z.object({ id: z.string(), name: z.string(), type: z.string() })),
  sender: z.object({ name: z.string().optional(), email: z.string() }),
  to: z.array(z.object({ name: z.string().optional(), email: z.string() })),
  cc: z.array(z.object({ name: z.string().optional(), email: z.string() })).nullable(),
  bcc: z.array(z.object({ name: z.string().optional(), email: z.string() })).nullable(),
  tls: z.boolean(),
  listUnsubscribe: z.string().optional(),
  listUnsubscribePost: z.string().optional(),
  receivedOn: z.string(),
  unread: z.boolean(),
  body: z.string(),
  processedHtml: z.string(),
  blobUrl: z.string(),
  decodedBody: z.string().optional(),
  references: z.string().optional(),
  inReplyTo: z.string().optional(),
  replyTo: z.string().optional(),
  messageId: z.string().optional(),
  threadId: z.string().optional(),
  attachments: z
    .array(
      z.object({
        attachmentId: z.string(),
        filename: z.string(),
        mimeType: z.string(),
        size: z.number(),
        body: z.string(),
        headers: z.array(z.object({ name: z.string().nullable(), value: z.string().nullable() })),
      }),
    )
    .optional(),
  isDraft: z.boolean().optional(),
});

export type ParsedMessage = z.infer<typeof ParsedMessageSchema>;

export interface Attachment {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
  body: string;
  headers: { name?: string | null; value?: string | null }[];
}
export interface MailListProps {
  isCompact?: boolean;
}

export type MailSelectMode = 'mass' | 'range' | 'single' | 'selectAllBelow';

export type ThreadProps = {
  message: { id: string };
  selectMode: MailSelectMode;
  // TODO: enforce types instead of sprinkling "any"
  onClick?: (message: ParsedMessage) => () => void;
  isCompact?: boolean;
  folder?: string;
  isKeyboardFocused?: boolean;
  isInQuickActionMode?: boolean;
  selectedQuickActionIndex?: number;
  resetNavigation?: () => void;
  demoMessage?: ParsedMessage;
};

export type ConditionalThreadProps = ThreadProps &
  (
    | { demo?: true; sessionData?: { userId: string; connectionId: string | null } }
    | { demo?: false; sessionData: { userId: string; connectionId: string | null } }
  );

export interface IOutgoingMessage {
  to: Sender[];
  cc?: Sender[];
  bcc?: Sender[];
  subject: string;
  message: string;
  attachments: {
    name: string;
    type: string;
    size: number;
    lastModified: number;
    base64: string;
  }[];
  headers: Record<string, string>;
  threadId?: string;
  fromEmail?: string;
  isForward?: boolean;
  originalMessage?: string | null;
}
export interface DeleteAllSpamResponse {
  success: boolean;
  message: string;
  count?: number;
  error?: string;
}

export enum Tools {
  GetThread = 'getThread',
  ComposeEmail = 'composeEmail',
  DeleteEmail = 'deleteEmail',
  MarkThreadsRead = 'markThreadsRead',
  MarkThreadsUnread = 'markThreadsUnread',
  ModifyLabels = 'modifyLabels',
  GetUserLabels = 'getUserLabels',
  SendEmail = 'sendEmail',
  CreateLabel = 'createLabel',
  BulkDelete = 'bulkDelete',
  BulkArchive = 'bulkArchive',
  DeleteLabel = 'deleteLabel',
  AskZeroMailbox = 'askZeroMailbox',
  AskZeroThread = 'askZeroThread',
  WebSearch = 'webSearch',
  InboxRag = 'inboxRag',
  BuildGmailSearchQuery = 'buildGmailSearchQuery',
}

export type AppContext = Context<{ Bindings: Env }>;

export enum EPrompts {
  SummarizeMessage = 'SummarizeMessage',
  ReSummarizeThread = 'ReSummarizeThread',
  SummarizeThread = 'SummarizeThread',
  Chat = 'Chat',
  Compose = 'Compose',
  //   ThreadLabels = 'ThreadLabels'
}
