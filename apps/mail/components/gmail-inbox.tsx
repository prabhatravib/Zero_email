import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGmailApi } from '@/hooks/use-gmail-api';
import { useGmailAuth } from '@/hooks/use-gmail-auth';
import { Loader2, Mail, Send, RefreshCw } from 'lucide-react';

interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  date: string;
}

export function GmailInbox() {
  const { isAuthenticated } = useGmailAuth();
  const { messages, isLoading, error, fetchEmails, hasMore } = useGmailApi();
  const [emailMessages, setEmailMessages] = useState<EmailMessage[]>([]);

  // Convert Gmail API messages to our format
  useEffect(() => {
    const formattedMessages = messages.map(msg => {
      const headers = msg.payload?.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
      const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender';
      const date = headers.find(h => h.name === 'Date')?.value || '';
      
      return {
        id: msg.id,
        subject,
        from,
        snippet: msg.snippet,
        date: new Date(date).toLocaleDateString(),
      };
    });
    
    setEmailMessages(formattedMessages);
  }, [messages]);

  // Load emails on mount and when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchEmails(10);
    }
  }, [isAuthenticated, fetchEmails]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Please sign in to view your emails</p>
        </div>
      </div>
    );
  }

  if (isLoading && emailMessages.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading emails...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="text-red-500 text-center">
          <p className="font-semibold">Error Loading Emails</p>
          <p className="text-sm">{error}</p>
        </div>
        <Button onClick={() => fetchEmails(10)} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Inbox</h2>
        <Button onClick={() => fetchEmails(10)} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {emailMessages.length === 0 ? (
        <div className="text-center py-8">
          <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No emails found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {emailMessages.map((email) => (
            <Card key={email.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="font-semibold text-sm truncate">{email.from}</p>
                      <span className="text-xs text-muted-foreground">{email.date}</span>
                    </div>
                    <p className="font-medium text-sm mb-1 truncate">{email.subject}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{email.snippet}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="text-center pt-4">
          <Button 
            onClick={() => fetchEmails(10)} 
            variant="outline"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Load More
          </Button>
        </div>
      )}
    </div>
  );
} 