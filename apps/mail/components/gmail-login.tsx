import { Button } from '@/components/ui/button';
import { useGmailAuth } from '@/hooks/use-gmail-auth';
import { Loader2, Mail } from 'lucide-react';

export function GmailLogin() {
  const { isAuthenticated, isLoading, user, error, signIn, signOut } = useGmailAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading Gmail...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="text-red-500 text-center">
          <p className="font-semibold">Authentication Error</p>
          <p className="text-sm">{error}</p>
        </div>
        <Button onClick={signIn} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="flex items-center space-x-3">
          {user.picture && (
            <img 
              src={user.picture} 
              alt={user.name}
              className="w-10 h-10 rounded-full"
            />
          )}
          <div>
            <p className="font-semibold">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <Button onClick={signOut} variant="outline">
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="text-center">
        <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-2xl font-bold mb-2">Connect to Gmail</h2>
        <p className="text-muted-foreground mb-6">
          Sign in with your Google account to access your Gmail
        </p>
      </div>
      <Button onClick={signIn} size="lg" className="w-full max-w-sm">
        <Mail className="mr-2 h-4 w-4" />
        Sign in with Google
      </Button>
    </div>
  );
} 