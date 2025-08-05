import { backgroundQueueAtom, isThreadInBackgroundQueueAtom } from '@/store/backgroundQueue';
import { useInfiniteQuery, useQuery, useMutation } from '@tanstack/react-query';
import { useTRPC } from '@/providers/query-provider';
import { useSearchValue } from '@/hooks/use-search-value';
import { useAtom, useAtomValue } from 'jotai';
import { useParams } from 'react-router';
import { useQueryState } from 'nuqs';
import { useSession } from '@/lib/auth-client';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from 'next-themes';
import { useMemo, useEffect, useCallback, useRef } from 'react';
import { useCategorizationWorker } from './use-categorization-worker';
import type { IGetThreadResponse } from '../../server/src/lib/driver/types';
import useSearchLabels from './use-labels-search';

export const useThreads = () => {
  const { folder } = useParams<{ folder: string }>();
  const [searchValue] = useSearchValue();
  const [backgroundQueue] = useAtom(backgroundQueueAtom);
  const isInQueue = useAtomValue(isThreadInBackgroundQueueAtom);
  const trpc = useTRPC();
  const { labels } = useSearchLabels();
  const [recent] = useQueryState('recent');
  const [selectedGroupId] = useQueryState('selectedGroupId');

  // Use the same Web Worker for categorization (silent background)
  const { 
    results: categorizationResults,
    categorizeEmails,
    isCategorizing,
    categorizationComplete
  } = useCategorizationWorker();

  // Get threads data
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

  // Get all threads for categorization
  const allThreads = useMemo(() => {
    return threadsQuery.data
      ? threadsQuery.data.pages
          .flatMap((e) => e.threads)
          .filter(Boolean)
          .filter((e) => !isInQueue(`thread:${e.id}`))
      : [];
  }, [threadsQuery.data, threadsQuery.dataUpdatedAt, isInQueue, backgroundQueue]);

  // Manual categorization function - will be called by button click
  const triggerCategorization = useCallback(async () => {
    if (allThreads.length > 0) {
      // Prepare email data with actual thread info for categorization
      const emailData = allThreads
        .filter(email => !categorizationResults.has(email.id))
        .map(thread => ({
          id: thread.id,
          subject: `Thread ${thread.id}`, // Use thread ID as subject
          body: `Email content for thread ${thread.id}`, // Use thread ID as body
          from: `sender@example.com` // Use default sender
        }));
      
      if (emailData.length > 0) {
        // Manual categorization triggered by user
        return categorizeEmails(emailData).catch(() => {
          // Silently handle errors - don't show to user
        });
      }
    }
  }, [allThreads, categorizeEmails, categorizationResults]);

  // Filter threads based on selected group
  const threads = useMemo(() => {
    if (!selectedGroupId) {
      return allThreads; // Show all threads when no group is selected
    }

    return allThreads.filter(thread => {
      const categories = categorizationResults.get(thread.id) || [];
      
      switch (selectedGroupId) {
        case 'fubo':
          return categories.includes('Fubo');
        case 'jobs':
          return categories.includes('Jobs and Employment');
        case 'others':
          // Show emails that are categorized as "Others" OR have no categorization yet
          return categories.includes('Others') || categories.length === 0 || !categorizationResults.has(thread.id);
        default:
          return true;
      }
    });
  }, [allThreads, selectedGroupId, categorizationResults]);

  const isEmpty = useMemo(() => threads.length === 0, [threads]);
  const isReachingEnd =
    isEmpty ||
    (threadsQuery.data &&
      !threadsQuery.data.pages[threadsQuery.data.pages.length - 1]?.nextPageToken);

  const loadMore = async () => {
    if (threadsQuery.isLoading || threadsQuery.isFetching) return;
    await threadsQuery.fetchNextPage();
  };

  return [threadsQuery, threads, isReachingEnd, loadMore, triggerCategorization, isCategorizing, categorizationComplete] as const;
};

export const useThread = (threadId: string | null) => {
  const { data: session } = useSession();
  const [_threadId] = useQueryState('threadId');
  const id = threadId ? threadId : _threadId;
  const trpc = useTRPC();
  const { data: settings } = useSettings();
  const { theme: systemTheme } = useTheme();

  const threadQuery = useQuery(
    trpc.mail.get.queryOptions(
      {
        id: id!,
      },
      {
        enabled: !!id && !!session?.user.id,
        staleTime: 1000 * 60 * 60, // 1 minute
      },
    ),
  );

  const { latestDraft, isGroupThread, finalData, latestMessage } = useMemo(() => {
    if (!threadQuery.data) {
      return {
        latestDraft: undefined,
        isGroupThread: false,
        finalData: undefined,
        latestMessage: undefined,
      };
    }

    const latestDraft = threadQuery.data.latest?.id
      ? threadQuery.data.messages.findLast((e) => e.isDraft)
      : undefined;

    const isGroupThread = threadQuery.data.latest?.id
      ? (() => {
          const totalRecipients = [
            ...(threadQuery.data.latest.to || []),
            ...(threadQuery.data.latest.cc || []),
            ...(threadQuery.data.latest.bcc || []),
          ].length;
          return totalRecipients > 1;
        })()
      : false;

    const nonDraftMessages = threadQuery.data.messages.filter((e) => !e.isDraft);
    const latestMessage = nonDraftMessages[nonDraftMessages.length - 1];

    const finalData: IGetThreadResponse = {
      ...threadQuery.data,
      messages: nonDraftMessages,
    };

    return { latestDraft, isGroupThread, finalData, latestMessage };
  }, [threadQuery.data]);

  const { mutateAsync: processEmailContent } = useMutation(
    trpc.mail.processEmailContent.mutationOptions(),
  );

  // Extract image loading condition to avoid duplication
  const shouldLoadImages = useMemo(() => {
    if (!settings?.settings || !latestMessage?.sender?.email) return false;
    
    return settings.settings.externalImages ||
      settings.settings.trustedSenders?.includes(latestMessage.sender.email) ||
      false;
  }, [settings?.settings, latestMessage?.sender?.email]);

  // Prefetch query - intentionally unused, just for caching
  useQuery({
    queryKey: [
      'email-content',
      latestMessage?.id,
      shouldLoadImages,
      systemTheme,
    ],
    queryFn: async () => {
      if (!latestMessage?.decodedBody || !settings?.settings) return null;

      const userTheme =
        settings.settings.colorTheme === 'system' ? systemTheme : settings.settings.colorTheme;
      const theme = userTheme === 'dark' ? 'dark' : 'light';

      const result = await processEmailContent({
        html: latestMessage.decodedBody,
        shouldLoadImages,
        theme,
      });

      return {
        html: result.processedHtml,
        hasBlockedImages: result.hasBlockedImages,
      };
    },
    enabled: !!latestMessage?.decodedBody && !!settings?.settings,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  return { ...threadQuery, data: finalData, isGroupThread, latestDraft };
};
