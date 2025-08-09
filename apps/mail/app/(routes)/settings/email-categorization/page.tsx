import { EmailCategorizationTest } from '@/components/email-categorization-test';

export default function EmailCategorizationPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Email Categorization</h1>
          <p className="text-muted-foreground mt-2">
            Test and understand how emails are automatically categorized using AI
          </p>
        </div>
        
        <EmailCategorizationTest />
      </div>
    </div>
  );
} 