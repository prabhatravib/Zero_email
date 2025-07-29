import { v4 as uuidv4 } from 'uuid';

interface InlineImage {
  cid: string;
  data: string;
  mimeType: string;
}

export const sanitizeTipTapHtml = async (
  html: string,
): Promise<{ html: string; inlineImages: InlineImage[] }> => {
  const inlineImages: InlineImage[] = [];

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

  // Simple HTML sanitization without external dependencies
  const clean = processedHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');

  const renderedHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  <div>${clean}</div>
</body>
</html>`;

  return {
    html: renderedHtml,
    inlineImages,
  };
};
