import { useState, useCallback } from 'react';

interface CategorizationResult {
  success: boolean;
  categories: string[];
  note?: string;
  error?: string;
}

interface EmailData {
  id: string;
  subject: string;
  body: string;
  from: string;
}

export const useAICategorization = () => {
  const [isCategorizing, setIsCategorizing] = useState(false);

  const categorizeEmail = useCallback(async (emailContent: string): Promise<string[]> => {
    setIsCategorizing(true);
    
    try {
      // Truncate email content if it's too long to avoid API limits
      const truncatedContent = emailContent.length > 4000 ? emailContent.substring(0, 4000) + '...' : emailContent;
      
      const response = await fetch('/api/email-handler/categorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailContent: truncatedContent }),
      });

      if (!response.ok) {
        console.error('Categorization API error:', response.status, response.statusText);
        return ['Others'];
      }

      const data: CategorizationResult = await response.json();
      
      if (data.success) {
        return data.categories;
      } else {
        console.error('Categorization failed:', data.error);
        return ['Others']; // Fallback to Others
      }
    } catch (error) {
      console.error('Categorization request failed:', error);
      return ['Others']; // Fallback to Others
    } finally {
      setIsCategorizing(false);
    }
  }, []);

  const categorizeEmails = useCallback(async (emails: EmailData[]): Promise<Map<string, string[]>> => {
    setIsCategorizing(true);
    const results = new Map<string, string[]>();
    
    try {
      // Process emails in batches to avoid overwhelming the API
      const batchSize = 3; // Reduced batch size for better reliability
      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (email) => {
            try {
              // Combine subject and body for better categorization
              const emailContent = `Subject: ${email.subject}\n\nBody: ${email.body}`;
              const categories = await categorizeEmail(emailContent);
              results.set(email.id, categories);
            } catch (error) {
              console.error(`Failed to categorize email ${email.id}:`, error);
              results.set(email.id, ['Others']);
            }
          })
        );
        
        // Add a small delay between batches to avoid rate limiting
        if (i + batchSize < emails.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      return results;
    } catch (error) {
      console.error('Batch categorization failed:', error);
      
      // Fallback: assign all emails to Others
      emails.forEach(email => {
        results.set(email.id, ['Others']);
      });
      
      return results;
    } finally {
      setIsCategorizing(false);
    }
  }, [categorizeEmail]);

  return {
    categorizeEmail,
    categorizeEmails,
    isCategorizing,
  };
}; 