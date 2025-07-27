declare namespace Cloudflare {
  declare interface Env {
    snoozed_emails: KVNamespace;
    unsnooze_queue: Queue;
    zero: Fetcher & {
      subscribe: (data: { connectionId: string; providerId: string }) => Promise<void>;
      unsubscribe: (data: { connectionId: string; providerId: string }) => Promise<void>;
    };
    JWT_SECRET: string;
    VITE_PUBLIC_APP_URL: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    GOOGLE_REDIRECT_URI: string;
  }
}
