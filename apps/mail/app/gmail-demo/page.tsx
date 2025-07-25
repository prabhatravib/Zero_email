import { GmailLogin } from '@/components/gmail-login';
import { GmailInbox } from '@/components/gmail-inbox';
import { useGmailAuth } from '@/hooks/use-gmail-auth';

export default function GmailDemoPage() {
  const { isAuthenticated } = useGmailAuth();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Gmail Integration Demo</h1>
            <p className="text-muted-foreground">
              Simple Gmail integration using Google API SDK
            </p>
          </div>

          {!isAuthenticated ? (
            <GmailLogin />
          ) : (
            <GmailInbox />
          )}
        </div>
      </div>
    </div>
  );
} 