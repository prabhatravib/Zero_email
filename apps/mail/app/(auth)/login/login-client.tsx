import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { Google } from '@/components/icons/icons';
import ErrorMessage from '@/app/(auth)/login/error-message';
import { Button } from '@/components/ui/button';
import { TriangleAlert } from 'lucide-react';
import { signIn } from '@/lib/auth-client';
import { useNavigate } from 'react-router';
import { useQueryState } from 'nuqs';
import { toast } from 'sonner';

interface LoginClientProps {
  providers: any[];
  isProd: boolean;
}

const getProviderIcon = (providerId: string, className?: string): ReactNode => {
  const defaultClass = className || 'w-5 h-5 mr-2';

  switch (providerId) {
    case 'google':
      return <Google className={defaultClass} />;
    default:
      return null;
  }
};

function LoginClientContent({ providers, isProd }: LoginClientProps) {
  const navigate = useNavigate();
  const [error, _] = useQueryState('error');
  const [isLoading, setIsLoading] = useState(false);

  const handleGmailLogin = async () => {
    try {
      setIsLoading(true);
      await signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}/auth/callback/google`,
      });
    } catch (error) {
      console.error('Gmail login failed:', error);
      toast.error('Failed to connect to Gmail. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-between bg-[#111111]">
      <div className="animate-in slide-in-from-bottom-4 mx-auto flex max-w-[600px] flex-grow items-center justify-center space-y-8 px-4 duration-500 sm:px-12 md:px-0">
        <div className="w-full space-y-4">
          <p className="text-center text-4xl font-bold text-white md:text-5xl">Connect to Gmail</p>

          {error && (
            <Alert variant="default" className="border-orange-500/40 bg-orange-500/10">
              <AlertTitle className="text-orange-400">Error</AlertTitle>
              <AlertDescription>Failed to connect to Gmail. Please try again.</AlertDescription>
            </Alert>
          )}

          <div className="rounded-lg border border-black/10 bg-black/5 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center">
              <TriangleAlert size={28} />
              <p className="ml-2 text-sm text-black/80 dark:text-white/80">
                Connect your Gmail account to access your emails
              </p>
            </div>
          </div>

          <ErrorMessage />

          <div className="relative z-10 mx-auto flex w-full flex-col items-center justify-center gap-2">
            <Button
              onClick={handleGmailLogin}
              disabled={isLoading}
              className="border-input bg-background text-primary hover:bg-accent hover:text-accent-foreground h-12 w-full rounded-lg border-2"
            >
              {getProviderIcon('google')}
              {isLoading ? 'Connecting...' : 'Continue with Gmail'}
            </Button>
          </div>
        </div>
      </div>
      
      <a href={'/'} className="text-white hover:text-gray-300">Return home</a>

      <footer className="w-full px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-6">
          <a
            href="/terms"
            className="text-[10px] text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Terms of Service
          </a>
          <a
            href="/privacy"
            className="text-[10px] text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Privacy Policy
          </a>
        </div>
      </footer>
    </div>
  );
}

export function LoginClient(props: LoginClientProps) {
  const fallback = (
    <div className="flex min-h-screen w-full items-center justify-center">
      <p>Loading...</p>
    </div>
  );

  return (
    <Suspense fallback={fallback}>
      <LoginClientContent {...props} />
    </Suspense>
  );
}
