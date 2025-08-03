import { useMemo } from 'react';
import { useThreads } from './use-threads';
import { useQueryState } from 'nuqs';
import type { EmailGroup, Email } from '@/components/mail/email-groups';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTRPC } from '@/providers/query-provider';
import { useSearchValue } from '@/hooks/use-search-value';
import useSearchLabels from './use-labels-search';
import { useSession } from '@/lib/auth-client';
import { useAtom, useAtomValue } from 'jotai';
import { useParams } from 'react-router';
import { backgroundQueueAtom, isThreadInBackgroundQueueAtom } from '@/store/backgroundQueue';

export const useEmailGroups = () => {
  const { folder } = useParams<{ folder: string }>();
  const [searchValue] = useSearchValue();
  const [backgroundQueue] = useAtom(backgroundQueueAtom);
  const isInQueue = useAtomValue(isThreadInBackgroundQueueAtom);
  const trpc = useTRPC();
  const { labels } = useSearchLabels();
  const [recent] = useQueryState('recent');
  const [selectedGroupId] = useQueryState('selectedGroupId');

  // Get unfiltered threads data for accurate counting
  const maxResults = recent === '50' ? 50 : undefined;
  
  const unfilteredThreadsQuery = useInfiniteQuery(
    trpc.mail.listThreads.infiniteQueryOptions(
      {
        q: searchValue.value,
        folder,
        labelIds: labels,
        ...(maxResults && { maxResults }),
      },
      {
        initialCursor: '',
        getNextPageParam: (lastPage) => lastPage?.nextPageToken ?? null,
        staleTime: 60 * 1000 * 1, // 1 minute
        refetchOnMount: true,
        refetchIntervalInBackground: true,
        retry: (failureCount, error) => {
          // Retry up to 3 times for network errors, but not for 500 errors
          if (failureCount >= 3) return false;
          if (error?.message?.includes('500')) return false;
          return true;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
    ),
  );

  // Get unfiltered threads for counting
  const unfilteredThreads = useMemo(() => {
    return unfilteredThreadsQuery.data
      ? unfilteredThreadsQuery.data.pages
          .flatMap((e) => e.threads)
          .filter(Boolean)
          .filter((e) => !isInQueue(`thread:${e.id}`))
      : [];
  }, [unfilteredThreadsQuery.data, unfilteredThreadsQuery.dataUpdatedAt, isInQueue, backgroundQueue]);

  // Get filtered threads for display (from useThreads)
  const [threadsQuery, threads, isReachingEnd, loadMore] = useThreads();

  // Convert threads to email groups format
  const emailGroups = useMemo(() => {
    if (!unfilteredThreads || unfilteredThreads.length === 0) {
      return [
        {
          id: 'fubo',
          name: 'FUBO Related',
          count: 0,
          color: 'bg-blue-500',
          emails: []
        },
        {
          id: 'others',
          name: 'Others',
          count: 0,
          color: 'bg-gray-500',
          emails: []
        }
      ];
    }

    // For now, put all emails in "Others" group (same as inbox logic)
    // Later this will be modified with LLM logic for FUBO categorization
    // The email groups are for display purposes - the actual filtering happens in the mail interface
    const allEmails: Email[] = unfilteredThreads.map((thread, index) => {
      return {
        id: thread.id,
        groupId: 'others', // All emails go to "Others" for now
        sender: `Email ${index + 1}`, // Placeholder - real data will come from mail interface
        subject: `Thread ${thread.id}`, // Placeholder - real data will come from mail interface
        timestamp: new Date() // Placeholder - real data will come from mail interface
      };
    });

    // Email groups display logic - use unfiltered data for accurate counts
    const fuboCount = 0; // Always 0 for now, will be LLM logic later
    const othersCount = unfilteredThreads.length; // Use unfiltered count

    return [
      {
        id: 'fubo',
        name: 'FUBO Related',
        count: fuboCount,
        color: 'bg-blue-500',
        emails: [] // Always empty for now
      },
      {
        id: 'others',
        name: 'Others',
        count: othersCount,
        color: 'bg-gray-500',
        emails: allEmails // Always show all emails in the group display
      }
    ];
  }, [unfilteredThreads, selectedGroupId]);

  const totalEmails = emailGroups.reduce((sum, group) => sum + group.count, 0);
  const totalGroups = emailGroups.length;

  return {
    emailGroups,
    totalEmails,
    totalGroups,
    isLoading: unfilteredThreadsQuery.isLoading,
    isFetching: unfilteredThreadsQuery.isFetching,
    loadMore
  };
}; 