import { useTRPC } from '@/providers/query-provider';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/lib/auth-client';

export const useConnections = () => {
  const trpc = useTRPC();
  const { data: session, isPending } = useSession();
  
  const connectionsQuery = useQuery(
    trpc.connections.list.queryOptions(void 0, {
      enabled: !isPending && !!session?.user?.id, // Only run when authenticated
    })
  );
  return connectionsQuery;
};

export const useActiveConnection = () => {
  const trpc = useTRPC();
  const { data: session, isPending } = useSession();
  
  const connectionsQuery = useQuery(
    trpc.connections.getDefault.queryOptions(void 0, {
      staleTime: 1000 * 60 * 60, // 1 hour,
      gcTime: 1000 * 60 * 60 * 24, // 24 hours,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      enabled: !isPending && !!session?.user?.id, // Only run when authenticated
    }),
  );
  return connectionsQuery;
};
