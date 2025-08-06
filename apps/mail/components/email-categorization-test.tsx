import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, Tv, Briefcase, Folder } from 'lucide-react';
import { toast } from 'sonner';

interface CategorizationResult {
  success: boolean;
  categories: string[];
  note?: string;
  error?: string;
}

export function EmailCategorizationTest() {
  const [emailContent, setEmailContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CategorizationResult | null>(null);

  const testEmails = [
    {
      name: 'Fubo TV Email',
      content: 'Your Fubo TV subscription has been renewed. You will be charged $64.99 for the next month. Enjoy your favorite shows and sports content!',
    },
    {
      name: 'Job Application',
      content: 'Thank you for your interest in the Software Engineer position at our company. We have received your application and will review it within the next few days.',
    },
    {
      name: 'Generic Email',
      content: 'Hello, this is just a regular email about our upcoming meeting next week. Please let me know if you have any questions.',
    },
  ];

  const handleCategorize = async () => {
    if (!emailContent.trim()) {
      toast.error('Please enter some email content');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/email-handler/categorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailContent }),
      });

      const data: CategorizationResult = await response.json();
      setResult(data);

      if (data.success) {
        toast.success('Email categorized successfully!');
      } else {
        // Silent failure - no error indication to user
        setResult({
          success: false,
          categories: ['Others'],
          error: data.error
        });
      }
    } catch (error) {
      // Silent failure - no error indication to user
      setResult({
        success: false,
        categories: ['Others'],
        error: 'Categorization failed'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestEmail = (content: string) => {
    setEmailContent(content);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Fubo':
        return <Tv className="h-4 w-4" />;
      case 'Jobs and Employment':
        return <Briefcase className="h-4 w-4" />;
      case 'Others':
        return <Folder className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Fubo':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Jobs and Employment':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Others':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Categorization Test</CardTitle>
          <CardDescription>
            Test the AI-powered email categorization system. Every email will be categorized into Fubo, Jobs and Employment, or Others.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email Content</label>
            <Textarea
              placeholder="Enter email content to categorize..."
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
              rows={6}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleCategorize} 
              disabled={isLoading || !emailContent.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Categorizing...
                </>
              ) : (
                'Categorize Email'
              )}
            </Button>
          </div>

          {/* Test Email Examples */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Test Examples</label>
            <div className="flex gap-2 flex-wrap">
              {testEmails.map((testEmail, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestEmail(testEmail.content)}
                >
                  {testEmail.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-2">Categorization Results</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Categories:</span>
                    <div className="flex gap-2">
                      {result.categories.map((category) => (
                        <Badge
                          key={category}
                          variant="outline"
                          className={`flex items-center gap-1 ${getCategoryColor(category)}`}
                        >
                          {getCategoryIcon(category)}
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {result.note && (
                    <p className="text-sm text-muted-foreground">{result.note}</p>
                  )}
                  {result.error && (
                    <p className="text-sm text-red-600">{result.error}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Information */}
      <Card>
        <CardHeader>
          <CardTitle>Category Information</CardTitle>
          <CardDescription>
            Understanding how emails are categorized
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Tv className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium">Fubo</h4>
                <p className="text-sm text-muted-foreground">
                  Emails from Fubo TV streaming service including subscriptions, content updates, billing, and promotions.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Briefcase className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium">Jobs and Employment</h4>
                <p className="text-sm text-muted-foreground">
                  Job postings, recruitment emails, employment opportunities, and career-related content.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Folder className="h-5 w-5 text-gray-600 mt-0.5" />
              <div>
                <h4 className="font-medium">Others</h4>
                <p className="text-sm text-muted-foreground">
                  All other emails that don't fit into the specific categories above. Every email is automatically included in this category.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 