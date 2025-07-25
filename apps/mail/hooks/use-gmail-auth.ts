import { useState, useEffect, useCallback } from 'react';

interface GmailAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: {
    email: string;
    name: string;
    picture: string;
  } | null;
  error: string | null;
}

export function useGmailAuth() {
  const [authState, setAuthState] = useState<GmailAuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    error: null,
  });

  // Initialize Gmail API
  const initializeGmail = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      // Load the Gmail API
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google API'));
        document.head.appendChild(script);
      });

      // Initialize the API
      await new Promise<void>((resolve, reject) => {
        (window as any).gapi.load('client:auth2', async () => {
          try {
            await (window as any).gapi.client.init({
              clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
              scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
              discoveryDocs: ['https://gmail.googleapis.com/$discovery/rest?version=v1'],
            });
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });

      // Check if user is already signed in
      const auth2 = (window as any).gapi.auth2.getAuthInstance();
      if (auth2.isSignedIn.get()) {
        const user = auth2.currentUser.get();
        const profile = user.getBasicProfile();
        
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user: {
            email: profile.getEmail(),
            name: profile.getName(),
            picture: profile.getImageUrl(),
          },
          error: null,
        });
      } else {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: null,
        });
      }
    } catch (error) {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: error instanceof Error ? error.message : 'Failed to initialize Gmail API',
      });
    }
  }, []);

  // Sign in with Google
  const signIn = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const auth2 = (window as any).gapi.auth2.getAuthInstance();
      const user = await auth2.signIn();
      const profile = user.getBasicProfile();
      
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        user: {
          email: profile.getEmail(),
          name: profile.getName(),
          picture: profile.getImageUrl(),
        },
        error: null,
      });
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to sign in',
      }));
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      const auth2 = (window as any).gapi.auth2.getAuthInstance();
      await auth2.signOut();
      
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      });
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to sign out',
      }));
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeGmail();
  }, [initializeGmail]);

  return {
    ...authState,
    signIn,
    signOut,
    initializeGmail,
  };
} 