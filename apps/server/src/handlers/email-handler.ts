// Email handler with lazy loading
// This module handles email sending operations and only loads heavy dependencies when needed

import { getReactEmailComponents, getReactEmailRender, getResend, getSanitizeHtml } from '../lib/lazy-modules';
import { env } from 'cloudflare:workers';
import React from 'react';

export interface EmailData {
  to: string | string[];
  from: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

export interface ReactEmailData {
  to: string | string[];
  from: string;
  subject: string;
  react: React.ReactElement;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

export class EmailHandler {
  private resend: unknown = null;

  constructor() {}

  private async initializeResend() {
    if (!this.resend) {
      const { Resend } = await getResend();
      this.resend = new Resend(env.RESEND_API_KEY);
    }
    return this.resend;
  }

  /**
   * Send email using Resend with lazy loading
   */
  async sendEmail(emailData: EmailData) {
    const resend = await this.initializeResend();

    const response = await resend.emails.send({
      to: emailData.to,
      from: emailData.from,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      attachments: emailData.attachments,
    });

    return response;
  }

  /**
   * Send React Email with lazy loading
   */
  async sendReactEmail(emailData: ReactEmailData) {
    const resend = await this.initializeResend();
    const { render } = await getReactEmailRender();

    // Render the React component to HTML
    const html = await render(emailData.react);

    const response = await resend.emails.send({
      to: emailData.to,
      from: emailData.from,
      subject: emailData.subject,
      html,
      attachments: emailData.attachments,
    });

    return response;
  }

  /**
   * Create a React Email component with lazy loading
   */
  async createReactEmailComponent(children: React.ReactElement) {
    const { Html } = await getReactEmailComponents();
    
    return React.createElement(Html, {}, children);
  }

  /**
   * Render React Email component to HTML string
   */
  async renderReactEmail(component: React.ReactElement): Promise<string> {
    const { render } = await getReactEmailRender();
    return await render(component);
  }

  /**
   * Sanitize HTML content with lazy loading
   */
  async sanitizeHtml(html: string, options?: Record<string, unknown>): Promise<string> {
    const sanitizeHtmlModule = await getSanitizeHtml();
    return sanitizeHtmlModule.default(html, options);
  }

  /**
   * Process and sanitize TipTap HTML with inline images
   */
  async processTipTapHtml(html: string): Promise<{
    html: string;
    inlineImages: Array<{
      cid: string;
      data: string;
      mimeType: string;
    }>;
  }> {
    const { v4: uuidv4 } = await import('uuid');
    const sanitizeHtmlModule = await getSanitizeHtml();
    const { render } = await getReactEmailRender();
    const { Html } = await getReactEmailComponents();

    const inlineImages: Array<{
      cid: string;
      data: string;
      mimeType: string;
    }> = [];

    // Process inline images
    const processedHtml = html.replace(
      /<img[^>]+src=["']data:([^;]+);base64,([^"']+)["'][^>]*>/gi,
      (match, mimeType, base64Data) => {
        const cid = `image_${uuidv4()}@0.email`;
        inlineImages.push({
          cid,
          data: base64Data,
          mimeType,
        });

        return match.replace(/src=["']data:[^"']+["']/i, `src="cid:${cid}"`);
      },
    );

    // Sanitize HTML
    const clean = sanitizeHtmlModule.default(processedHtml, {
      allowedTags: sanitizeHtmlModule.defaults.allowedTags.concat(['img']),
      allowedAttributes: {
        ...sanitizeHtmlModule.defaults.allowedAttributes,
        img: ['src', 'alt', 'width', 'height', 'style'],
      },
      allowedSchemes: ['http', 'https', 'cid', 'data'],
    });

    // Render with React Email
    const renderedHtml = await render(
      React.createElement(
        Html,
        {},
        React.createElement('div', { dangerouslySetInnerHTML: { __html: clean } }),
      ) as React.ReactElement,
    );

    return {
      html: renderedHtml,
      inlineImages,
    };
  }
}

// Factory function to create email handler
export function createEmailHandler(): EmailHandler {
  return new EmailHandler();
} 