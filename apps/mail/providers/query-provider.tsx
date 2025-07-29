import {
  PersistQueryClientProvider,
  type PersistedClient,
  type Persister,
} from '@tanstack/react-query-persist-client';
import { QueryCache, QueryClient, hashKey } from '@tanstack/react-query';
import { createTRPCContext } from '@trpc/tanstack-react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { useMemo, type PropsWithChildren } from 'react';
import type { AppRouter } from '@zero/server/trpc';
import { CACHE_BURST_KEY } from '@/lib/constants';
import { signOut } from '@/lib/auth-client';
import { get, set, del } from 'idb-keyval';
import superjson from 'superjson';

function createIDBPersister(idbValidKey: IDBValidKey = 'zero-query-cache') {
  // If IndexedDB is not available (e.g. in 3rd-party iframes or browser privacy mode)
  // react-query persistence would hang forever, leaving the app on the spinner.
  // We fall back to a no-op in-memory persister so hydration can finish.

  const noopPersister: Persister = {
    persistClient: async () => {},
    restoreClient: async () => undefined,
    removeClient: async () => {},
  };

  try {
    if (typeof indexedDB === 'undefined') return noopPersister;
    // simple feature-test — will throw in some restricted contexts
    const test = indexedDB.open('__test__');
    test.onerror = () => {};
  } catch {
    return noopPersister;
  }

  return {
    persistClient: async (client: PersistedClient) => {
      try {
        await set(idbValidKey, client);
      } catch {
        /* ignore */
      }
    },
    restoreClient: async () => {
      try {
        return await get<PersistedClient>(idbValidKey);
      } catch {
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        await del(idbValidKey);
      } catch {
        /* ignore */
      }
    },
  } satisfies Persister;
}

export const makeQueryClient = (connectionId: string | null) =>
  new QueryClient({
    queryCache: new QueryCache({
      onError: (err, { meta }) => {
        if (meta && meta.noGlobalError === true) return;
        if (meta && typeof meta.customError === 'string') console.error(meta.customError);
        else if (
          err.message === 'Required scopes missing' ||
          err.message.includes('Invalid connection')
        ) {
          signOut({
            fetchOptions: {
              onSuccess: () => {
                if (window.location.href.includes('/login')) return;
                window.location.href = '/login?error=required_scopes_missing';
              },
            },
          });
        } else console.error(err.message || 'Something went wrong');
      },
    }),
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        queryKeyHashFn: (queryKey) => hashKey([{ connectionId }, ...queryKey]),
        gcTime: 1000 * 60 * 1,
      },
      mutations: {
        onError: (err) => console.error(err.message),
      },
    },
  });

let browserQueryClient = {
  queryClient: null,
  activeConnectionId: null,
} as {
  queryClient: QueryClient | null;
  activeConnectionId: string | null;
};

const getQueryClient = (connectionId: string | null) => {
  if (typeof window === 'undefined') {
    return makeQueryClient(connectionId);
  } else {
    if (!browserQueryClient.queryClient || browserQueryClient.activeConnectionId !== connectionId) {
      browserQueryClient.queryClient = makeQueryClient(connectionId);
      browserQueryClient.activeConnectionId = connectionId;
    }
    return browserQueryClient.queryClient;
  }
};

const getUrl = () => import.meta.env.VITE_PUBLIC_BACKEND_URL + '/api/trpc';

export const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>();

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    // loggerLink({ enabled: () => true }),
    httpBatchLink({
      transformer: superjson,
      url: getUrl(),
      methodOverride: 'POST',
      maxItems: 1,
      fetch: (url, options) =>
        fetch(url, { ...options, credentials: 'include' }).then((res) => {
          const currentPath = new URL(window.location.href).pathname;
          const redirectPath = res.headers.get('X-Zero-Redirect');
          if (!!redirectPath && redirectPath !== currentPath) window.location.href = redirectPath;
          return res;
        }),
    }),
  ],
});

export function QueryProvider({
  children,
  connectionId,
}: PropsWithChildren<{ connectionId: string | null }>) {
  const persister = useMemo(
    () => createIDBPersister(`zero-query-cache-${connectionId ?? 'default'}`),
    [connectionId],
  );
  const queryClient = useMemo(() => getQueryClient(connectionId), [connectionId]);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        buster: CACHE_BURST_KEY,
        maxAge: 1000 * 60 * 1, // 1 minute, we're storing in DOs,
      }}
    >
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </PersistQueryClientProvider>
  );
}
