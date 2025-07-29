import type { PropsWithChildren } from 'react';
import { QueryProvider } from './query-provider';

// Client providers that include the QueryProvider for tRPC functionality
export function ClientProviders({ 
  children, 
  connectionId 
}: PropsWithChildren<{ connectionId: string | null }>) {
  return (
    <QueryProvider connectionId={connectionId}>
      {children}
    </QueryProvider>
  );
}
