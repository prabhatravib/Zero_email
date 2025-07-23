import { useTRPC } from '@/providers/query-provider';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/lib/auth-client';

export function useSettings() {
  const { data: session, isPending } = useSession();
  const trpc = useTRPC();

  const settingsQuery = useQuery(
    trpc.settings.get.queryOptions(void 0, {
      enabled: !isPending && !!session?.user?.id,
      staleTime: Infinity,
    }),
  );

  return settingsQuery;
}
