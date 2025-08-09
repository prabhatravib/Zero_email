import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import { useSearchValue } from '@/hooks/use-search-value';

interface LoadRecentButtonProps {
  onLoadRecent: () => void;
  isLoading: boolean;
}

export const LoadRecentButton = ({ onLoadRecent, isLoading }: LoadRecentButtonProps) => {
  const [, setSearchValue] = useSearchValue();

  const handleLoadRecent = () => {
    // Set a search query to get only the last 50 emails
    setSearchValue({
      value: 'in:inbox newer_than:7d', // Get emails from last 7 days
      highlight: '',
      folder: '',
    });
    onLoadRecent();
  };

  return (
    <Button
      onClick={handleLoadRecent}
      disabled={isLoading}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <Clock className="h-4 w-4" />
      {isLoading ? 'Loading...' : 'Inbox (50 latest)'}
    </Button>
  );
}; 