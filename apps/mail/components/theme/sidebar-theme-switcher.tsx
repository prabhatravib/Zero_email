import { useTheme } from 'next-themes';

import { MoonIcon } from '../icons/animated/moon';
import { SunIcon } from '../icons/animated/sun';
import { useEffect, useState } from 'react';
import { useSettings } from '@/hooks/use-settings';
import { useTRPC } from '@/providers/query-provider';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

export function SidebarThemeSwitch() {
  const [isRendered, setIsRendered] = useState(false);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { data: settingsData, refetch } = useSettings();
  const trpc = useTRPC();
  const { mutateAsync: saveUserSettings } = useMutation(trpc.settings.save.mutationOptions());

  // Prevents hydration error
  useEffect(() => setIsRendered(true), []);

  async function handleThemeToggle() {
    const newTheme = theme === 'dark' ? 'light' : 'dark';

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

    if (document.startViewTransition && newTheme !== resolvedTheme) {
      document.documentElement.style.viewTransitionName = 'theme-transition';
      await document.startViewTransition(update).finished;
      document.documentElement.style.viewTransitionName = '';
    } else {
      update();
    }
  }

  if (!isRendered) return null;

  return (
    <div onClick={handleThemeToggle} className="flex cursor-pointer items-center gap-2 text-[13px]">
      {theme === 'dark' ? <MoonIcon className="opacity-60" /> : <SunIcon className="opacity-60" />}
      <p className="text-[13px] opacity-60">App Theme</p>
    </div>
  );
}
