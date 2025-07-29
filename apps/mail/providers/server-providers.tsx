import type { PropsWithChildren } from 'react';

// Minimal server providers that don't use client-side hooks
export function ServerProviders({
  children,
  connectionId,
}: PropsWithChildren<{ connectionId: string | null }>) {
  return <>{children}</>;
}
