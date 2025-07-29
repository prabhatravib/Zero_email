import type { PropsWithChildren } from 'react';

// Minimal client providers for server-side rendering
export function ClientProviders({ children }: PropsWithChildren) {
  return <>{children}</>;
}
