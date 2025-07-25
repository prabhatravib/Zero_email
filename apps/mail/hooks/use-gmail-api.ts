import { useState, useCallback } from 'react';

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  historyId: string;
  internalDate: string;
  payload?: {
    headers: Array<{
      name: string;
      value: string;
    }>;
    body?: {
      data?: string;
    };
  };
}

interface GmailApiState {
  isLoading: boolean;
  error: string | null;
  messages: GmailMessage[];
  hasMore: boolean;
}

export function useGmailApi() {
  const [state, setState] = useState<GmailApiState>({
    isLoading: false,
    error: null,
    messages: [],
    hasMore: true,
  });

  // Get access token
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const auth2 = (window as any).gapi.auth2.getAuthInstance();
      if (!auth2.isSignedIn.get()) {
        throw new Error('User not authenticated');
      }
      
      const user = auth2.currentUser.get();
      const authResponse = user.getAuthResponse();
      return authResponse.access_token;
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  }, []);

  // Fetch emails
  const fetchEmails = useCallback(async (maxResults = 20, pageToken?: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('No access token available');
      }

      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}${pageToken ? `&pageToken=${pageToken}` : ''}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch emails: ${response.statusText}`);
      }

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        messages: pageToken ? [...prev.messages, ...data.messages] : data.messages,
        hasMore: !!data.nextPageToken,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch emails',
      }));
    }
  }, [getAccessToken]);

  // Get email details
  const getEmailDetails = useCallback(async (messageId: string): Promise<GmailMessage | null> => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('No access token available');
      }

      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch email details: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get email details:', error);
      return null;
    }
  }, [getAccessToken]);

  // Send email
  const sendEmail = useCallback(async (to: string, subject: string, body: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('No access token available');
      }

      // Create email in base64 format
      const email = [
        `To: ${to}`,
        'Content-Type: text/plain; charset=utf-8',
        'MIME-Version: 1.0',
        `Subject: ${subject}`,
        '',
        body,
      ].join('\r\n');

      const base64Email = btoa(email).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      const response = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            raw: base64Email,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to send email: ${response.statusText}`);
      }

      setState(prev => ({ ...prev, isLoading: false }));
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      }));
      return false;
    }
  }, [getAccessToken]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [],
      hasMore: true,
    }));
  }, []);

  return {
    ...state,
    fetchEmails,
    getEmailDetails,
    sendEmail,
    clearMessages,
  };
} 