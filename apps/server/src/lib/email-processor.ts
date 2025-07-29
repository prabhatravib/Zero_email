interface ProcessEmailOptions {
  html: string;
  shouldLoadImages: boolean;
  theme: 'light' | 'dark';
}

// Server-side: Simple HTML sanitization
export function preprocessEmailHtml(html: string): string {
  // Simple HTML sanitization without external dependencies
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframes
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/<a\s+([^>]*?)>/gi, (match, attrs) => {
      // Ensure all links open in new tab
      if (!attrs.includes('target=')) {
        return match.replace('>', ' target="_blank" rel="noopener noreferrer">');
      }
      return match;
    });

  return sanitized;
}

// Client-side: Theme and preference-specific processing
export function applyEmailPreferences(
  preprocessedHtml: string,
  theme: 'light' | 'dark',
  shouldLoadImages: boolean,
): { processedHtml: string; hasBlockedImages: boolean } {
  let processedHtml = preprocessedHtml;
  let hasBlockedImages = false;

  // Simple image processing
  if (!shouldLoadImages) {
    processedHtml = processedHtml.replace(
      /<img\s+([^>]*?)>/gi,
      '<img $1 style="display:none;" data-blocked="true">'
    );
    hasBlockedImages = true;
  }

  // Simple theme processing
  if (theme === 'dark') {
    processedHtml = processedHtml.replace(
      /<body/gi,
      '<body style="background-color: #1a1a1a; color: #ffffff;"'
    );
  }

  return { processedHtml, hasBlockedImages };
}

export function processEmailHtml({ html, shouldLoadImages, theme }: ProcessEmailOptions): {
  processedHtml: string;
  hasBlockedImages: boolean;
} {
  const preprocessed = preprocessEmailHtml(html);
  return applyEmailPreferences(preprocessed, theme, shouldLoadImages);
}
