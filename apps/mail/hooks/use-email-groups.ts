import { useMemo } from 'react';
import { useThreads } from './use-threads';
import { useQueryState } from 'nuqs';
import type { EmailGroup, Email } from '@/components/mail/email-groups';
import { useTRPC } from '@/providers/query-provider';
import { useParams } from 'react-router';
import { useSearchValue } from '@/hooks/use-search-value';
import useSearchLabels from './use-labels-search';

export const useEmailGroups = () => {
  const [threadsQuery, threads, isReachingEnd, loadMore] = useThreads();
  const [selectedGroupId] = useQueryState('selectedGroupId');
  
  // Get unfiltered thread count for accurate group counts
  const { folder } = useParams<{ folder: string }>();
  const [searchValue] = useSearchValue();
  const trpc = useTRPC();
  const { labels } = useSearchLabels();
  
  const unfilteredThreadsQuery = trpc.mail.listThreads.useQuery(
    {
      q: searchValue.value,
      folder: folder ?? 'inbox',
      labelIds: labels,
      maxResults: 1000, // Get a larger sample for accurate counting
    },
    {
      staleTime: 60 * 1000 * 1, // 1 minute
      refetchOnMount: true,
    }
  );

  // Convert threads to email groups format
  const emailGroups = useMemo(() => {
    // Use unfiltered data for accurate counts
    const allThreads = unfilteredThreadsQuery.data?.threads || [];
    const totalThreadCount = allThreads.length;
    
    if (totalThreadCount === 0) {
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
    const allEmails: Email[] = allThreads.map((thread, index) => {
      return {
        id: thread.id,
        groupId: 'others', // All emails go to "Others" for now
        sender: `Email ${index + 1}`, // Placeholder - real data will come from mail interface
        subject: `Thread ${thread.id}`, // Placeholder - real data will come from mail interface
        timestamp: new Date() // Placeholder - real data will come from mail interface
      };
    });

    // Email groups display logic - counts should remain static regardless of selection
    const fuboCount = 0; // Always 0 for now, will be LLM logic later
    const othersCount = totalThreadCount; // Use actual thread count

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
  }, [unfilteredThreadsQuery.data]); // Only depend on unfiltered data

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