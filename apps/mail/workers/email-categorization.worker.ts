// Email Categorization Web Worker
// This worker handles AI categorization of emails in the background

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

interface WorkerMessage {
  type: 'CATEGORIZE_EMAILS';
  emails: EmailData[];
  batchId: string;
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

// Backend base URL is injected from the main thread for reliability across environments
let API_BASE_URL = '' as string;

// Categorize a single email
async function categorizeEmail(emailContent: string): Promise<string[]> {
  try {
    // Truncate email content if it's too long to avoid API limits
    const truncatedContent = emailContent.length > 4000 
      ? emailContent.substring(0, 4000) + '...' 
      : emailContent;
    
    if (!API_BASE_URL) {
      // Without a configured base URL, avoid making a bad relative request
      return ['Others'];
    }
    const endpoint = `${API_BASE_URL.replace(/\/$/, '')}/api/email-handler/categorize`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ emailContent: truncatedContent }),
    });

    if (!response.ok) {
      return ['Others'];
    }

    const data: CategorizationResult = await response.json();
    
    if (data.success) {
      return data.categories;
    } else {
      return ['Others'];
    }
  } catch (error) {
    return ['Others'];
  }
}

// Process emails in batches (silent background processing)
async function processEmailBatch(emails: EmailData[], batchId: string) {
  console.log('🔧 Worker: Starting batch processing for', emails.length, 'emails, batchId:', batchId);
  const results = new Map<string, string[]>();
  const batchSize = 5; // Larger batches since we're in a worker
  
  try {
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      console.log('🔧 Worker: Processing batch', Math.floor(i / batchSize) + 1, 'with', batch.length, 'emails');
      
      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(async (email) => {
          try {
            const emailContent = `Subject: ${email.subject}\n\nBody: ${email.body}`;
            const categories = await categorizeEmail(emailContent);
            console.log('🔧 Worker: Email', email.id, 'categorized as:', categories);
            return { id: email.id, categories };
          } catch (error) {
            console.error('🔧 Worker: Error categorizing email', email.id, ':', error);
            return { id: email.id, categories: ['Others'] };
          }
        })
      );
      
      // Add results to map
      batchResults.forEach(({ id, categories }) => {
        results.set(id, categories);
      });
      
      // Small delay between batches to be nice to the API
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    console.log('🔧 Worker: Completed processing, sending', results.size, 'results for batchId:', batchId);
    console.log('🔧 Worker: Sample results:', Array.from(results.entries()).slice(0, 3));
    
    // Send final results only
    self.postMessage({
      type: 'CATEGORIZATION_RESULT',
      results: results,
      batchId
    } as WorkerResponse);
    
  } catch (error) {
    console.error('🔧 Worker: Error in batch processing:', error);
    // Fallback: assign all emails to Others
    emails.forEach(email => {
      results.set(email.id, ['Others']);
    });
    
    self.postMessage({
      type: 'CATEGORIZATION_ERROR',
      error: error instanceof Error ? error.message : String(error),
      batchId
    } as WorkerError);
  }
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
  const message: any = event.data;
  if (message.type === 'CONFIG' && typeof message.baseUrl === 'string') {
    API_BASE_URL = message.baseUrl;
    return;
  }
  const m = message as WorkerMessage;
  if (m.type === 'CATEGORIZE_EMAILS') {
    processEmailBatch(m.emails, m.batchId);
  }
});

// Handle errors
self.addEventListener('error', (error) => {
  self.postMessage({
    type: 'CATEGORIZATION_ERROR',
    error: error.message,
    batchId: 'unknown'
  } as WorkerError);
});

export {}; 