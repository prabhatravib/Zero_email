import { renderToString } from 'react-dom/server';

export const sanitizeTipTapHtml = async (html: string) => {
  // Simple HTML sanitization without external dependencies
  const clean = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');

  return renderToString(
    <html>
      <body>
        <div dangerouslySetInnerHTML={{ __html: clean }} />
      </body>
    </html>,
  );
};
