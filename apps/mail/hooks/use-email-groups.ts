import { useMemo } from 'react';
import { useThreads } from './use-threads';
import { useQueryState } from 'nuqs';
import type { EmailGroup, Email } from '@/components/mail/email-groups';

export const useEmailGroups = () => {
  const [threadsQuery, threads, isReachingEnd, loadMore] = useThreads();
  const [selectedGroupId] = useQueryState('selectedGroupId');

  // Convert threads to email groups format
  const emailGroups = useMemo(() => {
    if (!threads || threads.length === 0) {
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
    const allEmails: Email[] = threads.map((thread, index) => {
      return {
        id: thread.id,
        groupId: 'others', // All emails go to "Others" for now
        sender: `Email ${index + 1}`, // Placeholder - real data will come from mail interface
        subject: `Thread ${thread.id}`, // Placeholder - real data will come from mail interface
        timestamp: new Date() // Placeholder - real data will come from mail interface
      };
    });

    // Email groups display logic - actual filtering is handled by useThreads
    const fuboCount = 0; // Always 0 for now, will be LLM logic later
    const othersCount = allEmails.length; // Always show total count

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
  }, [threads, selectedGroupId]);

  const totalEmails = emailGroups.reduce((sum, group) => sum + group.count, 0);
  const totalGroups = emailGroups.length;

  return {
    emailGroups,
    totalEmails,
    totalGroups,
    isLoading: threadsQuery.isLoading,
    isFetching: threadsQuery.isFetching,
    loadMore
  };
}; 