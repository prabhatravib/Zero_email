import { useCallback, useRef, useEffect } from 'react';
import { useAtom } from 'jotai';
import {
  categorizationResultsAtom,
  categorizationErrorAtom,
  isCategorizingAtom,
  categorizationCompleteAtom,
  categorizationPendingResultsAtom,
} from '@/store/categorization';

interface EmailData {
  id: string;
  subject: string;
  body: string;
  from: string;
}

interface WorkerResponse {
  type: 'CATEGORIZATION_RESULT';
  results: Map<string, string[]>;
  batchId: string;
}

interface WorkerError {
  type: 'CATEGORIZATION_ERROR';
  error: string;
  batchId: string;
}

export const useCategorizationWorker = () => {
  const [results, setResults] = useAtom(categorizationResultsAtom);
  const [error, setError] = useAtom(categorizationErrorAtom);
  const [isCategorizing, setIsCategorizing] = useAtom(isCategorizingAtom);
  const [categorizationComplete, setCategorizationComplete] = useAtom(categorizationCompleteAtom);
  const [pendingResults, setPendingResults] = useAtom(categorizationPendingResultsAtom);

  // Module-scoped shared worker to prevent multiple instances
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalObj: any = typeof window !== 'undefined' ? window : globalThis;
  if (!globalObj.__zero_email_shared_worker) {
    globalObj.__zero_email_shared_worker = { worker: null as Worker | null, initialized: false };
  }
  const shared = globalObj.__zero_email_shared_worker as { worker: Worker | null; initialized: boolean };
  const workerRef = useRef<Worker | null>(shared.worker);

  // Watch for results changes and update completion state
  useEffect(() => {
    if (pendingResults && results.size > 0) {
      // Check if all pending results have been applied
      const allPendingApplied = Array.from(pendingResults.keys()).every(key => 
        results.has(key)
      );
      
      if (allPendingApplied) {
        console.log('✅ All pending results applied, marking categorization complete');
        setIsCategorizing(false);
        setCategorizationComplete(true);
        setPendingResults(null);
      }
    }
  }, [results, pendingResults]);

  // Initialize worker
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Always attach the shared worker reference for this hook instance
      if (shared.worker) {
        workerRef.current = shared.worker;
      }

      if (!shared.initialized) {
      try {
        shared.worker = new Worker(
          new URL('../workers/email-categorization.worker.ts', import.meta.url),
          { type: 'module' }
        );
        shared.initialized = true;
        workerRef.current = shared.worker;

        // Configure the worker with API base URL ASAP
        const baseUrl = (import.meta as any).env?.VITE_PUBLIC_BACKEND_URL || '';
        shared.worker.postMessage({ type: 'CONFIG', baseUrl });

        shared.worker.onmessage = (event: MessageEvent) => {
          const message = event.data;
          
          // Only handle messages without batchId (global messages)
          if (!message.batchId) {
            if (message.type === 'CATEGORIZATION_RESULT') {
              const { results: newResults } = message as WorkerResponse;
              
              // Update results silently
              setResults(prev => new Map([...prev, ...newResults]));
              // Mark categorization as complete
              setIsCategorizing(false);
              setCategorizationComplete(true);
            } else if (message.type === 'CATEGORIZATION_ERROR') {
              const { error: errorMessage } = message as WorkerError;
              setError(errorMessage);
              setIsCategorizing(false);
            }
          }
        };

        shared.worker.onerror = () => {
          setError('Worker error occurred');
        };
      } catch (err) {
        setError('Failed to initialize categorization worker');
      }
      }
    }

    // Do not terminate the shared worker on unmount
    return () => {};
  }, []);

  // Categorize emails using the worker (silent background processing)
  const categorizeEmails = useCallback(async (emails: EmailData[]): Promise<Map<string, string[]>> => {
    if (!workerRef.current) {
      throw new Error('Worker not initialized');
    }

    console.log('🚀 Starting categorization for', emails.length, 'emails');
    setIsCategorizing(true);
    setCategorizationComplete(false);

    // Generate unique batch ID
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('📦 Generated batch ID:', batchId);

    // Return a promise that resolves when categorization is complete
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error('⏰ Categorization timeout for batch:', batchId);
        reject(new Error('Categorization timeout'));
      }, 30000); // 30 second timeout

      // Create a one-time message handler for this batch
      const handleMessage = (event: MessageEvent) => {
        const message = event.data;
        console.log('📨 Received message:', message.type, 'batchId:', message.batchId, 'expected:', batchId);
        
        if (message.batchId === batchId) {
          if (message.type === 'CATEGORIZATION_RESULT') {
            const { results: newResults } = message as WorkerResponse;
            console.log('✅ Processing categorization results:', newResults.size, 'new results');
            console.log('📊 Sample results:', Array.from(newResults.entries()).slice(0, 3));
            
            // Update results
            setResults(prev => {
              const updatedResults = new Map([...prev, ...newResults]);
              console.log('🔄 Updated results map:', updatedResults.size, 'total results');
              // Resolve with the updated results
              resolve(updatedResults);
              return updatedResults;
            });
            
            // Set pending results to track when they're applied
            setPendingResults(newResults);
            
            // Remove the one-time handler
            if (workerRef.current) {
              workerRef.current.removeEventListener('message', handleMessage);
            }
            clearTimeout(timeout);
          } else if (message.type === 'CATEGORIZATION_ERROR') {
            const { error: errorMessage } = message as WorkerError;
            console.error('❌ Categorization error:', errorMessage);
            setError(errorMessage);
            setIsCategorizing(false);
            
            // Remove the one-time handler
            if (workerRef.current) {
              workerRef.current.removeEventListener('message', handleMessage);
            }
            clearTimeout(timeout);
            
            reject(new Error(errorMessage));
          }
        }
      };

      // Add the one-time message handler
      if (workerRef.current) {
        workerRef.current.addEventListener('message', handleMessage);
        console.log('👂 Added message handler for batch:', batchId);
      }

      // Send emails to worker
      if (workerRef.current) {
        workerRef.current.postMessage({
          type: 'CATEGORIZE_EMAILS',
          emails,
          batchId
        });
        console.log('📤 Sent emails to worker for batch:', batchId);
      }
    });
  }, [setError, setIsCategorizing, setCategorizationComplete]); // stable atoms

  // Clear results
  const clearResults = useCallback(() => {
    setResults(new Map());
    setError(null);
    setCategorizationComplete(false);
    setPendingResults(null);
  }, [setResults, setError, setCategorizationComplete, setPendingResults]);

  return {
    categorizeEmails,
    clearResults,
    results,
    error,
    isCategorizing,
    categorizationComplete,
    pendingResults
  };
}; 