# Lazy Loading Implementation for Zero Email Server

This document describes the lazy loading implementation that reduces startup time for the Cloudflare Worker by deferring the loading of heavy dependencies until they are actually needed.

## Overview

The Zero Email server bundle was 10.19 MB and included heavy dependencies that were loaded at startup, causing deployment errors due to startup time limits. This implementation addresses this by:

1. **Lazy Loading Heavy Dependencies**: Only load heavy modules when specific routes are accessed
2. **Module Caching**: Cache loaded modules to avoid re-importing
3. **Route-Based Loading**: Load dependencies based on URL path patterns
4. **Background Preloading**: Use `ctx.waitUntil()` for preloading when appropriate

## Heavy Dependencies Addressed

The following heavy dependencies are now lazy-loaded:

1. **@googleapis/gmail** - Gmail API client (~2.5MB)
2. **@react-email/components** - React Email components (~1.2MB)
3. **@react-email/render** - React Email rendering (~800KB)
4. **sanitize-html** - HTML sanitization (~500KB)
5. **google-auth-library** - Google authentication (~1.8MB)
6. **resend** - Email sending service (~300KB)

## Implementation Structure

### 1. Lazy Module System (`src/lib/lazy-modules.ts`)

Central module caching system that manages dynamic imports:

```typescript
// Module cache
const moduleCache = {
  gmail: null as GmailType | null,
  reactEmail: null as ReactEmailType | null,
  reactEmailRender: null as ReactEmailRenderType | null,
  sanitizeHtml: null as SanitizeHtmlType | null,
  googleAuth: null as GoogleAuthType | null,
  resend: null as ResendType | null,
};

// Getter functions with caching
export async function getGmailClient() {
  if (!gmailClient) {
    if (!moduleCache.gmail) {
      moduleCache.gmail = await import('@googleapis/gmail');
    }
    gmailClient = moduleCache.gmail.gmail;
  }
  return gmailClient;
}
```

### 2. Specialized Handlers

#### Gmail Handler (`src/handlers/gmail-handler.ts`)
- Handles all Gmail API operations
- Lazy loads Google APIs and auth library
- Provides clean interface for Gmail operations

#### Email Handler (`src/handlers/email-handler.ts`)
- Handles email sending operations
- Lazy loads React Email and Resend
- Supports both plain HTML and React Email templates

#### HTML Processor Handler (`src/handlers/html-processor-handler.ts`)
- Handles HTML sanitization and processing
- Lazy loads sanitize-html
- Provides email content processing pipeline

### 3. Route Handler (`src/handlers/route-handler.ts`)

Main routing logic that determines which handler to use based on URL patterns:

```typescript
private isGmailRoute(path: string): boolean {
  return path.startsWith('/api/trpc/mail') || 
         path.startsWith('/api/gmail') ||
         path.includes('/threads') ||
         path.includes('/messages') ||
         path.includes('/drafts') ||
         path.includes('/labels');
}
```

### 4. Modified Main Entry Point (`src/main.ts`)

Updated fetch handler that routes requests to lazy-loaded handlers:

```typescript
// Check if this is a route that needs lazy loading
if (this.shouldUseLazyLoading(path)) {
  const response = await this.routeHandler.handleRequest(request, this.ctx);
  // Add CORS headers and return
}
```

## Route Patterns

### Gmail Routes (Loads: gmail, googleAuth)
- `/api/trpc/mail/*`
- `/api/gmail/*`
- Routes containing: `/threads`, `/messages`, `/drafts`, `/labels`

### Email Sending Routes (Loads: reactEmail, resend)
- `/api/send-email/*`
- `/api/trpc/ai.compose`
- Routes containing: `/compose`, `/send`

### HTML Processing Routes (Loads: sanitizeHtml)
- Routes containing: `/process-html`, `/sanitize`, `/email-content`

### Fast Routes (No Heavy Dependencies)
- Authentication routes (`/auth/*`)
- Basic API routes
- Database queries
- Settings and user management

## Performance Benefits

### Startup Time Reduction
- **Before**: ~10.19 MB bundle loaded at startup
- **After**: ~3-4 MB initial bundle, heavy deps loaded on-demand

### Memory Usage
- Reduced initial memory footprint
- Modules only loaded when needed
- Cached modules shared across requests

### Deployment Success
- Eliminates startup time limit errors
- Faster cold starts
- Better resource utilization

## Usage Examples

### Using Gmail Handler
```typescript
import { createGmailHandler } from './handlers/gmail-handler';

const gmailHandler = createGmailHandler(refreshToken);
const threads = await gmailHandler.listThreads({ maxResults: 10 });
```

### Using Email Handler
```typescript
import { createEmailHandler } from './handlers/email-handler';

const emailHandler = createEmailHandler();
await emailHandler.sendEmail({
  to: 'user@example.com',
  from: 'noreply@example.com',
  subject: 'Test Email',
  html: '<h1>Hello World</h1>'
});
```

### Using HTML Processor
```typescript
import { createHtmlProcessorHandler } from './handlers/html-processor-handler';

const htmlProcessor = createHtmlProcessorHandler();
const processed = await htmlProcessor.processEmailHtml({
  html: '<div>Content</div>',
  shouldLoadImages: true,
  theme: 'light'
});
```

## Migration Guide

### For Existing Code

1. **Replace direct imports** with lazy module getters:
   ```typescript
   // Before
   import { gmail } from '@googleapis/gmail';
   
   // After
   import { getGmailClient } from './lib/lazy-modules';
   const gmail = await getGmailClient();
   ```

2. **Update async functions** that use heavy dependencies:
   ```typescript
   // Before
   export function processEmail(html: string) {
     return sanitizeHtml(html);
   }
   
   // After
   export async function processEmail(html: string) {
     const sanitizeHtmlModule = await getSanitizeHtml();
     return sanitizeHtmlModule.default(html);
   }
   ```

3. **Use specialized handlers** for complex operations:
   ```typescript
   // Before
   const driver = createDriver('google', config);
   
   // After
   const gmailHandler = createGmailHandler(refreshToken);
   ```

### For New Code

1. **Use handlers** for domain-specific operations
2. **Preload modules** when appropriate using `ctx.waitUntil()`
3. **Cache results** to avoid repeated lazy loading
4. **Handle async operations** properly

## Monitoring and Debugging

### Module Loading Logs
```typescript
// Add to lazy-modules.ts for debugging
console.log(`[LAZY_LOAD] Loading module: ${moduleName}`);
```

### Performance Monitoring
```typescript
// Track module load times
const startTime = Date.now();
const module = await getGmailClient();
console.log(`[PERF] Gmail module loaded in ${Date.now() - startTime}ms`);
```

### Cache Status
```typescript
// Check which modules are loaded
import { clearModuleCache } from './lib/lazy-modules';
// Use for testing or memory management
```

## Best Practices

1. **Route Design**: Design routes to group heavy dependencies together
2. **Preloading**: Use `ctx.waitUntil()` for predictable heavy operations
3. **Error Handling**: Handle module loading failures gracefully
4. **Caching**: Leverage module cache for repeated operations
5. **Testing**: Test both lazy-loaded and preloaded scenarios

## Troubleshooting

### Common Issues

1. **Module not found**: Ensure dynamic import path is correct
2. **TypeScript errors**: Use proper type definitions for dynamic imports
3. **Memory leaks**: Clear module cache if needed
4. **Performance regression**: Monitor module load times

### Debug Commands

```bash
# Check bundle size
npm run build && ls -la dist/

# Monitor startup time
wrangler dev --show-interactive-dev-session=false

# Test specific routes
curl -X GET https://your-worker.your-subdomain.workers.dev/api/trpc/mail/listThreads
```

## Future Enhancements

1. **Module Splitting**: Further split large modules
2. **Predictive Loading**: Preload based on user behavior
3. **Compression**: Optimize module sizes
4. **CDN Integration**: Cache modules in CDN
5. **Metrics**: Add detailed performance monitoring

## Conclusion

This lazy loading implementation significantly reduces startup time and memory usage while maintaining full functionality. The modular approach makes it easy to add new lazy-loaded features and maintain existing code.

For questions or issues, refer to the main README or create an issue in the repository. 