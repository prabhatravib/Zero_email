import type { MailManager, ManagerConfig } from './types';
import { OutlookMailManager } from './microsoft';

// Lazy load Google driver to reduce startup time
const supportedProviders = {
  google: null as unknown, // Will be lazily loaded
  microsoft: OutlookMailManager,
};

export const createDriver = async (
  provider: keyof typeof supportedProviders | (string & {}),
  config: ManagerConfig,
): Promise<MailManager> => {
  if (provider === 'google') {
    // Lazy load Google driver
    if (!supportedProviders.google) {
      const { GoogleMailManager } = await import('./google');
      supportedProviders.google = GoogleMailManager;
    }
    return new supportedProviders.google(config);
  }
  
  const Provider = supportedProviders[provider as keyof typeof supportedProviders];
  if (!Provider) throw new Error('Provider not supported');
  return new Provider(config);
};
