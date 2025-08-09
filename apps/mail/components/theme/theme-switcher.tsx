import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Laptop, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { m } from '@/paraglide/messages';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useSettings } from '@/hooks/use-settings';
import { useTRPC } from '@/providers/query-provider';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ModeToggleProps {
  className?: string;
}

export function ModeToggle({ className }: ModeToggleProps) {
  const [mounted, setMounted] = useState(false);

  // Fixes SSR hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  const { theme, systemTheme, resolvedTheme, setTheme } = useTheme();
  const { data: settingsData, refetch } = useSettings();
  const trpc = useTRPC();
  const { mutateAsync: saveUserSettings } = useMutation(trpc.settings.save.mutationOptions());

  async function handleThemeChange(newTheme: string) {
    let nextResolvedTheme = newTheme;

    if (newTheme === 'system' && systemTheme) {
      nextResolvedTheme = systemTheme;
    }

    function update() {
      setTheme(newTheme);
    }

    // Save to server if we have settings data
    if (settingsData?.settings) {
      try {
        await saveUserSettings({
          ...settingsData.settings,
          colorTheme: newTheme,
        });
        await refetch();
      } catch (error) {
        console.error('Failed to save theme to server:', error);
        toast.error('Failed to save theme preference');
      }
    }

    if (document.startViewTransition && nextResolvedTheme !== resolvedTheme) {
      document.documentElement.style.viewTransitionName = 'theme-transition';
      await document.startViewTransition(update).finished;
      document.documentElement.style.viewTransitionName = '';
    } else {
      update();
    }
  }

  if (!mounted) {
    return <div className="h-9" />;
  }

  return (
    <Select value={theme} onValueChange={handleThemeChange}>
      <SelectTrigger className={cn(className)}>
        <SelectValue placeholder="Select theme">
          <div className="flex items-center gap-2 capitalize">
            {theme === 'dark' && <Moon className="h-4 w-4" />}
            {theme === 'light' && <Sun className="h-4 w-4" />}
            {theme === 'system' && <Laptop className="h-4 w-4" />}
            {m[`common.themes.${theme as 'dark' | 'light' | 'system'}`]()}
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="dark">
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4" />
            {m['common.themes.dark']()}
          </div>
        </SelectItem>
        <SelectItem value="system">
          <div className="flex items-center gap-2">
            <Laptop className="h-4 w-4" />
            {m['common.themes.system']()}
          </div>
        </SelectItem>
        <SelectItem value="light">
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4" />
            {m['common.themes.light']()}
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
