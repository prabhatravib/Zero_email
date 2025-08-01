import { getReactEmailComponents, getReactEmailRender, getSanitizeHtml } from './lazy-modules';
import { v4 as uuidv4 } from 'uuid';
import React from 'react';

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

  const sanitizeHtmlModule = await getSanitizeHtml();
  const { render } = await getReactEmailRender();
  const { Html } = await getReactEmailComponents();

  const clean = sanitizeHtmlModule.default(processedHtml, {
    allowedTags: sanitizeHtmlModule.defaults.allowedTags.concat(['img']),
    allowedAttributes: {
      ...sanitizeHtmlModule.defaults.allowedAttributes,
      img: ['src', 'alt', 'width', 'height', 'style'],
    },
    allowedSchemes: ['http', 'https', 'cid', 'data'],
  });

  const renderedHtml = await render(
    React.createElement(
      Html,
      {},
      React.createElement('div', { dangerouslySetInnerHTML: { __html: clean } }),
    ) as any,
  );

  return {
    html: renderedHtml,
    inlineImages,
  };
};
