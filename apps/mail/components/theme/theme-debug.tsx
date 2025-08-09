import { useTheme } from 'next-themes';
import { useSettings } from '@/hooks/use-settings';
import { useEffect, useState } from 'react';

export function ThemeDebug() {
  const { theme, resolvedTheme, systemTheme } = useTheme();
  const { data: settingsData, isLoading } = useSettings();
  const [localStorageTheme, setLocalStorageTheme] = useState<string | null>(null);

  useEffect(() => {
    // Check localStorage directly
    const stored = localStorage.getItem('zero-email-theme');
    setLocalStorageTheme(stored);
  }, [theme]);

  if (import.meta.env.PROD) return null; // Only show in development

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black/80 text-white p-4 rounded-lg text-xs font-mono max-w-sm">
      <h3 className="font-bold mb-2">Theme Debug</h3>
      <div className="space-y-1">
        <div>Theme: {theme}</div>
        <div>Resolved: {resolvedTheme}</div>
        <div>System: {systemTheme}</div>
        <div>LocalStorage: {localStorageTheme}</div>
        <div>Server Loading: {isLoading ? 'true' : 'false'}</div>
        <div>Server Theme: {settingsData?.settings?.colorTheme || 'none'}</div>
        <div>Has Server Settings: {settingsData?.settings ? 'yes' : 'no'}</div>
      </div>
    </div>
  );
} 