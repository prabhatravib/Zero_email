import { useState, useCallback, useRef } from 'react';

interface EmailData {
  id: string;
  subject: string;
  body: string;
  from: string;
}

interface CategorizationResult {
  success: boolean;
  categories: string[];
  note?: string;
  error?: string;
}

export const useEmailCategorization = () => {
  const [results, setResults] = useState<Map<string, string[]>>(new Map());
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [categorizationComplete, setCategorizationComplete] = useState(false);
  const [totalEmailsToProcess, setTotalEmailsToProcess] = useState(0);
  const [processedEmails, setProcessedEmails] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Categorize a single email
  const categorizeSingleEmail = useCallback(async (emailData: EmailData): Promise<string[]> => {
    try {
      console.log('🤖 Categorizing email:', {
        id: emailData.id,
        subject: emailData.subject,
        from: emailData.from,
        bodyPreview: emailData.body.substring(0, 200) + '...'
      });

      const response = await fetch('/api/email-handler/categorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailContent: `Subject: ${emailData.subject}\nFrom: ${emailData.from}\nBody: ${emailData.body}`
        }),
      });

      console.log('🤖 Categorization response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🤖 Categorization failed:', errorText);
        return ['Others'];
      }

      const result: CategorizationResult = await response.json();
      console.log('🤖 Categorization result:', result);
      
      if (result.success && result.categories) {
        console.log('🤖 Categories returned:', result.categories);
        return result.categories;
      } else {
        console.log('🤖 No categories returned, using fallback');
        return ['Others'];
      }
    } catch (error) {
      console.error('🤖 Categorization error:', error);
      return ['Others'];
    }
  }, []);

  // Categorize multiple emails in parallel
  const categorizeEmails = useCallback(async (emails: EmailData[]): Promise<Map<string, string[]>> => {
    if (emails.length === 0) {
      return new Map();
    }

    console.log('🚀 Starting categorization for', emails.length, 'emails');
    setIsCategorizing(true);
    setCategorizationComplete(false);
    setTotalEmailsToProcess(emails.length);
    setProcessedEmails(0);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    const results = new Map<string, string[]>();
    const batchSize = 5; // Process in small batches to avoid overwhelming the API

    try {
      for (let i = 0; i < emails.length; i += batchSize) {
        // Check if cancelled
        if (abortControllerRef.current?.signal.aborted) {
          console.log('🛑 Categorization cancelled');
          break;
        }

        const batch = emails.slice(i, i + batchSize);
        console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1} with ${batch.length} emails`);

        // Process batch in parallel
        const batchPromises = batch.map(async (email) => {
          try {
            const categories = await categorizeSingleEmail(email);
            return { id: email.id, categories };
          } catch (error) {
            console.error('❌ Error categorizing email', email.id, ':', error);
            return { id: email.id, categories: ['Others'] };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        
        // Add results to map
        batchResults.forEach(({ id, categories }) => {
          results.set(id, categories);
        });

        // Update progress
        setProcessedEmails(i + batch.length);
        setResults(new Map(results)); // Update UI with current results

        // Small delay between batches to be nice to the API
        if (i + batchSize < emails.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log('✅ Categorization completed, processed', results.size, 'emails');
      setCategorizationComplete(true);
      return results;

    } catch (error) {
      console.error('❌ Categorization failed:', error);
      setCategorizationComplete(true);
      return results;
    } finally {
      setIsCategorizing(false);
      setTotalEmailsToProcess(0);
      setProcessedEmails(0);
      abortControllerRef.current = null;
    }
  }, [categorizeSingleEmail]);

  // Cancel ongoing categorization
  const cancelCategorization = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Clear results
  const clearResults = useCallback(() => {
    setResults(new Map());
    setCategorizationComplete(false);
  }, []);

  return {
    results,
    isCategorizing,
    categorizationComplete,
    totalEmailsToProcess,
    processedEmails,
    categorizeEmails,
    categorizeSingleEmail,
    cancelCategorization,
    clearResults
  };
}; 