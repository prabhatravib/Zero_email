// Route handler with lazy loading
// This module routes requests to appropriate handlers based on URL paths
// and manages lazy loading of heavy dependencies

import { preloadModules } from '../lib/lazy-modules';
import { createGmailHandler } from './gmail-handler';
import { createEmailHandler } from './email-handler';
import { createHtmlProcessorHandler } from './html-processor-handler';
import type { HonoContext } from '../ctx';

export class RouteHandler {
  private gmailHandler: unknown = null;
  private emailHandler: unknown = null;
  private htmlProcessorHandler: unknown = null;

  constructor() {}

  /**
   * Route request based on URL path and lazy load appropriate handlers
   */
  async handleRequest(request: Request, ctx: HonoContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Preload modules based on route patterns
    await this.preloadModulesForRoute(path, ctx);

    // Route to appropriate handler
    if (this.isGmailRoute(path)) {
      return await this.handleGmailRequest(request, ctx);
    } else if (this.isEmailRoute(path)) {
      return await this.handleEmailRequest(request, ctx);
    } else if (this.isHtmlProcessingRoute(path)) {
      return await this.handleHtmlProcessingRequest(request, ctx);
    } else {
      // Default route - no heavy dependencies needed
      return await this.handleDefaultRequest(request, ctx);
    }
  }

  /**
   * Determine if route requires Gmail functionality
   */
  private isGmailRoute(path: string): boolean {
    return path.startsWith('/api/trpc/mail') || 
           path.startsWith('/api/gmail') ||
           path.includes('/threads') ||
           path.includes('/messages') ||
           path.includes('/drafts') ||
           path.includes('/labels');
  }

  /**
   * Determine if route requires email sending functionality
   */
  private isEmailRoute(path: string): boolean {
    return path.startsWith('/api/send-email') ||
           path.startsWith('/api/trpc/ai.compose') ||
           path.includes('/compose') ||
           path.includes('/send');
  }

  /**
   * Determine if route requires HTML processing functionality
   */
  private isHtmlProcessingRoute(path: string): boolean {
    return path.includes('/process-html') ||
           path.includes('/sanitize') ||
           path.includes('/email-content');
  }

  /**
   * Preload modules based on route pattern
   */
  private async preloadModulesForRoute(path: string, ctx: HonoContext): Promise<void> {
    const modulesToPreload: Array<'gmail' | 'reactEmail' | 'sanitizeHtml' | 'googleAuth' | 'resend'> = [];

    if (this.isGmailRoute(path)) {
      modulesToPreload.push('gmail', 'googleAuth');
    }

    if (this.isEmailRoute(path)) {
      modulesToPreload.push('reactEmail', 'resend');
    }

    if (this.isHtmlProcessingRoute(path)) {
      modulesToPreload.push('sanitizeHtml');
    }

    if (modulesToPreload.length > 0) {
      // Use ctx.waitUntil() to preload modules in background
      ctx.waitUntil(preloadModules(modulesToPreload));
    }
  }

  /**
   * Handle Gmail-related requests
   */
  private async handleGmailRequest(): Promise<Response> {
    // Initialize Gmail handler if not already done
    if (!this.gmailHandler) {
      // Get refresh token from session or request
      const refreshToken = await this.getRefreshTokenFromRequest(request, ctx);
      if (!refreshToken) {
        return new Response('Unauthorized - No refresh token', { status: 401 });
      }
      
      this.gmailHandler = createGmailHandler(refreshToken);
    }

    // Route to appropriate Gmail operation based on path
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path.includes('/threads')) {
        return await this.handleGmailThreads(request, ctx);
      } else if (path.includes('/messages')) {
        return await this.handleGmailMessages(request, ctx);
      } else if (path.includes('/drafts')) {
        return await this.handleGmailDrafts(request, ctx);
      } else if (path.includes('/labels')) {
        return await this.handleGmailLabels(request, ctx);
      } else {
        return new Response('Gmail route not found', { status: 404 });
      }
    } catch (error) {
      console.error('Gmail request error:', error);
      return new Response('Internal server error', { status: 500 });
    }
  }

  /**
   * Handle email sending requests
   */
  private async handleEmailRequest(): Promise<Response> {
    // Initialize email handler if not already done
    if (!this.emailHandler) {
      this.emailHandler = createEmailHandler();
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;

      if (path.includes('/send')) {
        return await this.handleEmailSend(request, ctx);
      } else if (path.includes('/compose')) {
        return await this.handleEmailCompose(request, ctx);
      } else {
        return new Response('Email route not found', { status: 404 });
      }
    } catch (error) {
      console.error('Email request error:', error);
      return new Response('Internal server error', { status: 500 });
    }
  }

  /**
   * Handle HTML processing requests
   */
  private async handleHtmlProcessingRequest(): Promise<Response> {
    // Initialize HTML processor handler if not already done
    if (!this.htmlProcessorHandler) {
      this.htmlProcessorHandler = createHtmlProcessorHandler();
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;

      if (path.includes('/sanitize')) {
        return await this.handleHtmlSanitize(request, ctx);
      } else if (path.includes('/process')) {
        return await this.handleHtmlProcess(request, ctx);
      } else {
        return new Response('HTML processing route not found', { status: 404 });
      }
    } catch (error) {
      console.error('HTML processing request error:', error);
      return new Response('Internal server error', { status: 500 });
    }
  }

  /**
   * Handle default requests (no heavy dependencies)
   */
  private async handleDefaultRequest(): Promise<Response> {
    // This would typically route to your existing Hono app
    // For now, return a simple response
    return new Response('Route handled by default handler', { status: 200 });
  }

  /**
   * Get refresh token from request or session
   */
  private async getRefreshTokenFromRequest(): Promise<string | null> {
    // Implementation depends on your auth system
    // This is a placeholder - you'll need to implement based on your auth setup
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      // Extract token from header
      const token = authHeader.replace('Bearer ', '');
      // You might need to decode the token or get refresh token from session
      return token;
    }
    return null;
  }

  // Placeholder methods for specific Gmail operations
  private async handleGmailThreads(): Promise<Response> {
    // Implementation for Gmail threads
    return new Response('Gmail threads handler', { status: 200 });
  }

  private async handleGmailMessages(): Promise<Response> {
    // Implementation for Gmail messages
    return new Response('Gmail messages handler', { status: 200 });
  }

  private async handleGmailDrafts(): Promise<Response> {
    // Implementation for Gmail drafts
    return new Response('Gmail drafts handler', { status: 200 });
  }

  private async handleGmailLabels(): Promise<Response> {
    // Implementation for Gmail labels
    return new Response('Gmail labels handler', { status: 200 });
  }

  // Placeholder methods for specific email operations
  private async handleEmailSend(): Promise<Response> {
    // Implementation for email sending
    return new Response('Email send handler', { status: 200 });
  }

  private async handleEmailCompose(): Promise<Response> {
    // Implementation for email composition
    return new Response('Email compose handler', { status: 200 });
  }

  // Placeholder methods for specific HTML processing operations
  private async handleHtmlSanitize(): Promise<Response> {
    // Implementation for HTML sanitization
    return new Response('HTML sanitize handler', { status: 200 });
  }

  private async handleHtmlProcess(): Promise<Response> {
    // Implementation for HTML processing
    return new Response('HTML process handler', { status: 200 });
  }
}

// Factory function to create route handler
export function createRouteHandler(): RouteHandler {
  return new RouteHandler();
} 