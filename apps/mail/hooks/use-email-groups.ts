import { useMemo, useCallback } from 'react';
import { useThreads } from './use-threads';
import { useQueryState } from 'nuqs';
import type { EmailGroup, Email } from '@/components/mail/email-groups';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useTRPC, useTRPCClient } from '@/providers/query-provider';
import { useSearchValue } from '@/hooks/use-search-value';
import useSearchLabels from './use-labels-search';
import { useSession } from '@/lib/auth-client';
import { useAtom, useAtomValue } from 'jotai';
import { useParams } from 'react-router';
import { backgroundQueueAtom, isThreadInBackgroundQueueAtom } from '@/store/backgroundQueue';
import { useCategorizationWorker } from './use-categorization-worker';

export const useEmailGroups = () => {
  const { folder } = useParams<{ folder: string }>();
  const [searchValue] = useSearchValue();
  const [backgroundQueue] = useAtom(backgroundQueueAtom);
  const isInQueue = useAtomValue(isThreadInBackgroundQueueAtom);
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const { labels } = useSearchLabels();
  const [recent] = useQueryState('recent');
  const [selectedGroupId] = useQueryState('selectedGroupId');

  // Shared worker + state for categorization
  const {
    results: categorizationResults,
    categorizeEmails,
    isCategorizing,
    categorizationComplete,
    pendingResults,
  } = useCategorizationWorker();

  // Use the same query directly to avoid circular dependency
  const maxResults = recent === '50' ? 50 : undefined;
  
  const threadsQuery = useInfiniteQuery(
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

  // Use the same threads data that useThreads uses for consistency
  const allThreads = useMemo(() => {
    return threadsQuery.data
      ? threadsQuery.data.pages
          .flatMap((e) => e.threads)
          .filter(Boolean)
          .filter((e) => !isInQueue(`thread:${e.id}`))
      : [];
  }, [threadsQuery.data, threadsQuery.dataUpdatedAt, isInQueue, backgroundQueue]);

  // categorizeEmails etc provided above

  // Manual categorization function
  const triggerCategorization = useCallback(async () => {
    if (allThreads.length > 0) {
      // Get threads that haven't been categorized yet
      const uncategorizedThreads = allThreads.filter(email => !categorizationResults.has(email.id));
      
      if (uncategorizedThreads.length === 0) {
        console.log('ℹ️ No new emails to categorize');
        return;
      }

      console.log('🚀 Triggering categorization for', uncategorizedThreads.length, 'emails');
      
      // Fetch full thread data for each uncategorized thread
      const emailDataPromises = uncategorizedThreads.map(async (thread) => {
        try {
          // Fetch full thread data via TRPC client (respects env + auth)
          const threadData = await trpcClient.mail.get.query({ id: thread.id });
          if (threadData) {
            const messages = threadData.messages || [];
            
            // Use the first email (seed email) for categorization, not the latest
            const seedMessage = messages[messages.length - 1] || messages[0]; // First email is usually at the end of the array
            
            // Client-side logging only; server logs won't show this
            console.log(`📧 Thread ${thread.id}: Using seed email for categorization:`, {
              totalMessages: messages.length,
              seedMessageSubject: (seedMessage as any)?.subject,
              seedMessageFrom: (seedMessage as any)?.sender?.email,
              seedMessageBodyPreview: (seedMessage as any)?.body?.substring(0, 100) || (seedMessage as any)?.snippet?.substring(0, 100)
            });
            
            return {
              id: thread.id,
              subject: seedMessage?.subject || `Thread ${thread.id}`,
              body: (seedMessage as any)?.body || (seedMessage as any)?.snippet || `Email content for thread ${thread.id}`,
              from: (seedMessage as any)?.sender?.email || `sender@example.com`
            };
          } else {
            console.error('Failed to fetch thread data for', thread.id, 'No data returned');
            // Automatically categorize as "Others" when fetch fails
            return {
              id: thread.id,
              subject: `Thread ${thread.id}`,
              body: `Email content for thread ${thread.id}`,
              from: `sender@example.com`,
              autoCategorizeAsOthers: true
            };
          }
        } catch (error) {
          console.error('Failed to fetch thread data for', thread.id, error);
          // Automatically categorize as "Others" when fetch fails
          return {
            id: thread.id,
            subject: `Thread ${thread.id}`,
            body: `Email content for thread ${thread.id}`,
            from: `sender@example.com`,
            autoCategorizeAsOthers: true
          };
        }
      });

      // Wait for all promises - no need to filter since we handle failures with auto-categorization
      const emailData = await Promise.all(emailDataPromises);
      
      if (emailData.length > 0) {
        return categorizeEmails(emailData).catch((error) => {
          console.error('❌ Categorization failed:', error);
          // Silently handle errors
        });
      }
    }
  }, [allThreads, categorizeEmails, categorizationResults]);

  // Convert threads to email groups format with AI categorization
  const emailGroups = useMemo(() => {
    if (!allThreads || allThreads.length === 0) {
      return [
        {
          id: 'fubo',
          name: 'FUBO Related',
          count: 0,
          color: 'bg-blue-500',
          emails: []
        },
        {
          id: 'jobs',
          name: 'Jobs and Employment',
          count: 0,
          color: 'bg-green-500',
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

    console.log('📧 Email Groups - Recalculating with:', {
      totalThreads: allThreads.length,
      categorizationResultsSize: categorizationResults.size,
      sampleResults: Array.from(categorizationResults.entries()).slice(0, 3),
      hasCategorizationResults: categorizationResults.size > 0
    });

    // Use AI categorization results if available, otherwise put all emails in "Others"
    const categorizedEmails: Email[] = allThreads.map((thread, index) => {
      // Check if we have AI categorization results
      const aiCategories = categorizationResults.get(thread.id);
      let groupId = 'others'; // Default to others
      
      if (aiCategories && aiCategories.length > 0) {
        console.log(`📊 Thread ${thread.id} has categories:`, aiCategories);
        // Use AI categorization results - check for exact matches
        if (aiCategories.some(cat => cat.toLowerCase().includes('fubo'))) {
          groupId = 'fubo';
          console.log(`✅ Thread ${thread.id} categorized as FUBO`);
        } else if (aiCategories.some(cat => 
          cat.toLowerCase().includes('jobs') || 
          cat.toLowerCase().includes('employment') ||
          cat.toLowerCase().includes('job')
        )) {
          groupId = 'jobs';
          console.log(`✅ Thread ${thread.id} categorized as Jobs`);
        } else {
          console.log(`📝 Thread ${thread.id} categorized as Others (categories: ${aiCategories.join(', ')})`);
        }
      } else {
        console.log(`❓ Thread ${thread.id} has no categorization results`);
      }
      // If no categorization results, it stays as "others"
      
      return {
        id: thread.id,
        groupId,
        sender: `Email ${index + 1}`,
        subject: `Thread ${thread.id}`,
        timestamp: new Date()
      };
    });

    // Count emails by category
    const fuboEmails = categorizedEmails.filter(email => email.groupId === 'fubo');
    const jobsEmails = categorizedEmails.filter(email => email.groupId === 'jobs');
    const othersEmails = categorizedEmails.filter(email => email.groupId === 'others');

    const result = [
      {
        id: 'fubo',
        name: 'FUBO Related',
        count: fuboEmails.length,
        color: 'bg-blue-500',
        emails: fuboEmails
      },
      {
        id: 'jobs',
        name: 'Jobs and Employment',
        count: jobsEmails.length,
        color: 'bg-green-500',
        emails: jobsEmails
      },
      {
        id: 'others',
        name: 'Others',
        count: othersEmails.length,
        color: 'bg-gray-500',
        emails: othersEmails
      }
    ];

    console.log('📊 Email Groups - Final Counts:', {
      fubo: fuboEmails.length,
      jobs: jobsEmails.length,
      others: othersEmails.length,
      totalCategorized: fuboEmails.length + jobsEmails.length + othersEmails.length,
      totalThreads: allThreads.length
    });

    return result;
  }, [allThreads, categorizationResults]);

  const totalEmails = emailGroups.reduce((sum, group) => sum + group.count, 0);
  const totalGroups = emailGroups.length;

  return {
    emailGroups,
    totalEmails,
    totalGroups,
    isLoading: threadsQuery.isLoading,
    isFetching: threadsQuery.isFetching,
    loadMore: threadsQuery.fetchNextPage,
    triggerCategorization,
    isCategorizing,
    categorizationComplete,
    pendingResults
  };
}; 