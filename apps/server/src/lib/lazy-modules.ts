// Lazy module caching system for heavy dependencies
// This helps reduce startup time by only loading modules when needed

// Type definitions for dynamic imports
type GmailType = typeof import('@googleapis/gmail');
type ReactEmailType = typeof import('@react-email/components');
type ReactEmailRenderType = typeof import('@react-email/render');
type SanitizeHtmlType = typeof import('sanitize-html');
type GoogleAuthType = typeof import('google-auth-library');
type ResendType = typeof import('resend');

// Module cache
const moduleCache = {
  gmail: null as GmailType | null,
  reactEmail: null as ReactEmailType | null,
  reactEmailRender: null as ReactEmailRenderType | null,
  sanitizeHtml: null as SanitizeHtmlType | null,
  googleAuth: null as GoogleAuthType | null,
  resend: null as ResendType | null,
};

// Gmail client cache
let gmailClient: any = null;

/**
 * Get Gmail API client with lazy loading
 */
export async function getGmailClient() {
  if (!gmailClient) {
    if (!moduleCache.gmail) {
      moduleCache.gmail = await import('@googleapis/gmail');
    }
    gmailClient = moduleCache.gmail.gmail;
  }
  return gmailClient;
}

/**
 * Get Gmail types for TypeScript support
 */
export async function getGmailTypes(): Promise<GmailType> {
  if (!moduleCache.gmail) {
    moduleCache.gmail = await import('@googleapis/gmail');
  }
  return moduleCache.gmail;
}

/**
 * Get React Email components with lazy loading
 */
export async function getReactEmailComponents(): Promise<ReactEmailType> {
  if (!moduleCache.reactEmail) {
    moduleCache.reactEmail = await import('@react-email/components');
  }
  return moduleCache.reactEmail;
}

/**
 * Get React Email render with lazy loading
 */
export async function getReactEmailRender(): Promise<ReactEmailRenderType> {
  if (!moduleCache.reactEmailRender) {
    moduleCache.reactEmailRender = await import('@react-email/render');
  }
  return moduleCache.reactEmailRender;
}

/**
 * Get sanitize-html with lazy loading
 */
export async function getSanitizeHtml(): Promise<SanitizeHtmlType> {
  if (!moduleCache.sanitizeHtml) {
    moduleCache.sanitizeHtml = await import('sanitize-html');
  }
  return moduleCache.sanitizeHtml;
}

/**
 * Get Google Auth Library with lazy loading
 */
export async function getGoogleAuth(): Promise<GoogleAuthType> {
  if (!moduleCache.googleAuth) {
    moduleCache.googleAuth = await import('google-auth-library');
  }
  return moduleCache.googleAuth;
}

/**
 * Get Resend client with lazy loading
 */
export async function getResend(): Promise<ResendType> {
  if (!moduleCache.resend) {
    moduleCache.resend = await import('resend');
  }
  return moduleCache.resend;
}

/**
 * Preload modules in background for better performance
 * Use ctx.waitUntil() to call this
 */
export async function preloadModules(modules: Array<'gmail' | 'reactEmail' | 'sanitizeHtml' | 'googleAuth' | 'resend'>) {
  const preloadPromises = modules.map(async (module) => {
    switch (module) {
      case 'gmail':
        return getGmailTypes();
      case 'reactEmail':
        return getReactEmailComponents();
      case 'sanitizeHtml':
        return getSanitizeHtml();
      case 'googleAuth':
        return getGoogleAuth();
      case 'resend':
        return getResend();
    }
  });

  await Promise.allSettled(preloadPromises);
}

/**
 * Clear module cache (useful for testing or memory management)
 */
export function clearModuleCache() {
  Object.keys(moduleCache).forEach(key => {
    (moduleCache as any)[key] = null;
  });
  gmailClient = null;
} 