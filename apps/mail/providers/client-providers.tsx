import { useKeyboardLayout } from '@/components/keyboard-layout-indicator';
import { LoadingProvider } from '@/components/context/loading-context';
import { NuqsAdapter } from 'nuqs/adapters/react-router/v7';
import { SidebarProvider } from '@/components/ui/sidebar';
import { PostHogProvider } from '@/lib/posthog-provider';
import { useSettings } from '@/hooks/use-settings';
import { Provider as JotaiProvider } from 'jotai';
import type { PropsWithChildren } from 'react';
import Toaster from '@/components/ui/toast';
import { ThemeProvider, useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { ThemeDebug } from '@/components/theme/theme-debug';

// Component to sync theme with server settings
function ThemeSync({ children }: PropsWithChildren) {
  const { data, isLoading } = useSettings();
  const { setTheme, theme } = useTheme();
  const [hasSynced, setHasSynced] = useState(false);

  useEffect(() => {
    // Only sync once when settings are loaded and we have a valid theme
    if (!isLoading && data?.settings?.colorTheme && !hasSynced) {
      const serverTheme = data.settings.colorTheme;
      console.log('ThemeSync: Setting theme to', serverTheme);
      
      // Only set if it's different from current theme
      if (theme !== serverTheme) {
        setTheme(serverTheme);
      }
      setHasSynced(true);
    }
  }, [data?.settings?.colorTheme, setTheme, isLoading, hasSynced, theme]);

  // Debug logging
  useEffect(() => {
    console.log('ThemeSync Debug:', {
      isLoading,
      hasServerSettings: !!data?.settings?.colorTheme,
      serverTheme: data?.settings?.colorTheme,
      currentTheme: theme,
      hasSynced,
    });
  }, [isLoading, data?.settings?.colorTheme, theme, hasSynced]);

  return <>{children}</>;
}

export function ClientProviders({ children }: PropsWithChildren) {
  const { data, isLoading } = useSettings();
  useKeyboardLayout();

  // Determine the initial theme
  const getInitialTheme = () => {
    // If we have server settings, use them
    if (data?.settings?.colorTheme) {
      return data.settings.colorTheme;
    }
    
    // If still loading, default to light to prevent flash
    if (isLoading) {
      return 'light';
    }
    
    // If no server settings, let next-themes handle it with localStorage
    return undefined;
  };

  const initialTheme = getInitialTheme();

  console.log('ClientProviders: Using theme', initialTheme, 'server theme:', data?.settings?.colorTheme, 'loading:', isLoading);

  return (
    <NuqsAdapter>
      <JotaiProvider>
        <ThemeProvider
          attribute="class"
          enableSystem
          disableTransitionOnChange
          defaultTheme="light"
          storageKey="zero-email-theme"
          forcedTheme={initialTheme}
        >
          <ThemeSync>
            <SidebarProvider>
              <PostHogProvider>
                <LoadingProvider>
                  {children}
                  <Toaster />
                  <ThemeDebug />
                </LoadingProvider>
              </PostHogProvider>
            </SidebarProvider>
          </ThemeSync>
        </ThemeProvider>
      </JotaiProvider>
    </NuqsAdapter>
  );
}
