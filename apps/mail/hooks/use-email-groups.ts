import { useMemo, useCallback, useEffect, useRef } from 'react';
import { useThreads } from './use-threads';
import { useQueryState } from 'nuqs';
import type { EmailGroup, Email } from '@/components/mail/email-groups';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/providers/query-provider';
import { useSearchValue } from '@/hooks/use-search-value';
import useSearchLabels from './use-labels-search';
import { useSession } from '@/lib/auth-client';
import { useAtom, useAtomValue } from 'jotai';
import { useParams } from 'react-router';
import { backgroundQueueAtom, isThreadInBackgroundQueueAtom } from '@/store/backgroundQueue';
import { useEmailCategorization } from './use-email-categorization';

export const useEmailGroups = () => {
  const { folder } = useParams<{ folder: string }>();
  const [searchValue] = useSearchValue();
  const [backgroundQueue] = useAtom(backgroundQueueAtom);
  const isInQueue = useAtomValue(isThreadInBackgroundQueueAtom);
  const trpc = useTRPC();
  const { labels } = useSearchLabels();
  const [recent] = useQueryState('recent');
  const [selectedGroupId] = useQueryState('selectedGroupId');
  const autoStartedRef = useRef(false);

  // Use the new categorization hook
  const { 
    results: categorizationResults,
    isCategorizing,
    categorizationComplete,
    totalEmailsToProcess,
    processedEmails,
    categorizeEmails,
    categorizeSingleEmail
  } = useEmailCategorization();

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

  // Auto-start categorization when new threads are loaded
  useEffect(() => {
    if (allThreads.length > 0 && !isCategorizing && !categorizationComplete && !autoStartedRef.current) {
      console.log('🔄 Auto-starting categorization for', allThreads.length, 'threads');
      autoStartedRef.current = true;
      // Make categorization non-blocking - don't let it break email loading
      triggerCategorization().catch(error => {
        console.warn('⚠️ Categorization failed but continuing with email loading:', error);
        // Reset the flag so it can try again later
        autoStartedRef.current = false;
      });
    }
  }, [allThreads.length, isCategorizing, categorizationComplete]);

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
      
      // Extract email content from threads
      const emailData = uncategorizedThreads.map(thread => {
        const threadWithContent = thread as any;
        
        // Add null checks for emailContent
        if (!threadWithContent.emailContent) {
          console.warn(`⚠️ Thread ${thread.id} has no emailContent, skipping categorization`);
          return null;
        }
        
        const { subject, body, from } = threadWithContent.emailContent;
        
        // Validate required fields
        if (!subject || !body || !from) {
          console.warn(`⚠️ Thread ${thread.id} has incomplete emailContent:`, {
            hasSubject: !!subject,
            hasBody: !!body,
            hasFrom: !!from
          });
          return null;
        }
        
        console.log(`📧 Thread ${thread.id}: Using email content:`, {
          subject,
          sender: from,
          bodyPreview: body.substring(0, 200) + '...'
        });
        
        return {
          id: thread.id,
          subject,
          body,
          from
        };
      }).filter((item): item is NonNullable<typeof item> => item !== null); // Remove null entries with proper typing
      
      if (emailData.length > 0) {
        return categorizeEmails(emailData).catch((error) => {
          console.error('❌ Categorization failed:', error);
          // Silently handle errors and return empty map to prevent blocking
          return new Map();
        });
      }
      
      // Return empty map if no emails to categorize
      return new Map();
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
      hasCategorizationResults: categorizationResults.size > 0,
      allThreadIds: allThreads.map(t => t.id).slice(0, 5),
      categorizationResultKeys: Array.from(categorizationResults.keys()).slice(0, 5),
      isCategorizing,
      categorizationComplete,
      processedEmails,
      totalEmailsToProcess
    });

    // Use AI categorization results if available, otherwise put all emails in "Others"
    const categorizedEmails: Email[] = allThreads.map((thread, index) => {
      // Check if we have AI categorization results
      const aiCategories = categorizationResults.get(thread.id);
      let groupId = 'others'; // Default to others
      
      if (aiCategories && aiCategories.length > 0) {
        console.log(`📊 Thread ${thread.id} has categories:`, aiCategories);
        // Use AI categorization results - check for exact matches
        if (aiCategories.includes('Fubo')) {
          groupId = 'fubo';
          console.log(`✅ Thread ${thread.id} categorized as FUBO`);
        } else if (aiCategories.includes('Jobs and Employment')) {
          groupId = 'jobs';
          console.log(`✅ Thread ${thread.id} categorized as Jobs`);
        } else {
          console.log(`📝 Thread ${thread.id} categorized as Others (categories: ${aiCategories.join(', ')})`);
        }
      } else {
        console.log(`❓ Thread ${thread.id} has no categorization results - this means AI returned empty array or failed`);
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

    console.log('📊 Email Groups - Categorization Assignment:', {
      totalEmails: categorizedEmails.length,
      fuboCount: fuboEmails.length,
      jobsCount: jobsEmails.length,
      othersCount: othersEmails.length,
      sampleFuboIds: fuboEmails.slice(0, 3).map(e => e.id),
      sampleJobsIds: jobsEmails.slice(0, 3).map(e => e.id),
      sampleOthersIds: othersEmails.slice(0, 3).map(e => e.id)
    });

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
  }, [allThreads, categorizationResults, isCategorizing, categorizationComplete, processedEmails, totalEmailsToProcess]);

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
    processedEmails,
    totalEmailsToProcess
  };
}; 