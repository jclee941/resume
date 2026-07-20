import { DEFAULT_LANGUAGE, HREFLANG_LINKS, SUPPORTED_LANGUAGES } from './constants.js';

const CANONICAL_BY_PATH = new Map([
  ['/', 'https://resume.jclee.me/'],
  ['/ko', 'https://resume.jclee.me/ko/'],
  ['/ko/', 'https://resume.jclee.me/ko/'],
  ['/en', 'https://resume.jclee.me/en/'],
  ['/en/', 'https://resume.jclee.me/en/'],
  ['/ja', 'https://resume.jclee.me/ja/'],
  ['/ja/', 'https://resume.jclee.me/ja/'],
]);

function localizeHtmlDocument(html, language, requestPath = null) {
  const localized = SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;
  const htmlWithLang = /<html[^>]*\slang=["'][^"']*["'][^>]*>/i.test(html)
    ? html.replace(/(<html[^>]*\slang=["'])[^"']*(["'][^>]*>)/i, `$1${localized}$2`)
    : html.replace(/<html([^>]*)>/i, `<html lang="${localized}"$1>`);
  const canonicalUrl = requestPath ? CANONICAL_BY_PATH.get(requestPath) : null;
  const htmlWithCanonical = canonicalUrl
    ? htmlWithLang.replace(
        /<link\s+rel=["']canonical["'][^>]*>/i,
        `<link rel="canonical" href="${canonicalUrl}" />`
      )
    : htmlWithLang;
  const htmlWithSocialUrl = canonicalUrl
    ? htmlWithCanonical
        .replace(
          /<meta\s+property=["']og:url["'][^>]*>/i,
          `<meta property="og:url" content="${canonicalUrl}" />`
        )
        .replace(
          /<meta\s+name=["']twitter:url["'][^>]*>/i,
          `<meta name="twitter:url" content="${canonicalUrl}" />`
        )
        .replace(/"url": "https:\/\/resume\.jclee\.me\/"/g, `"url": "${canonicalUrl}"`)
        .replace(/"item": "https:\/\/resume\.jclee\.me\/"/g, `"item": "${canonicalUrl}"`)
    : htmlWithCanonical;

  const htmlWithoutAlternates = htmlWithSocialUrl.replace(
    /\s*<link\s+rel=["']alternate["'][^>]*>/gi,
    ''
  );

  if (htmlWithoutAlternates.includes('</head>')) {
    return htmlWithoutAlternates.replace('</head>', `    ${HREFLANG_LINKS}\n  </head>`);
  }

  return htmlWithoutAlternates;
}

function isHtmlResponse(response) {
  const contentType = response.headers.get('Content-Type') || '';
  return contentType.includes('text/html');
}

async function localizeHtmlResponse(response, language, requestPath = null) {
  const html = await response.text();
  const headers = new Headers(response.headers);
  const localizedHtml = localizeHtmlDocument(html, language, requestPath);

  return new Response(localizedHtml, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export { isHtmlResponse, localizeHtmlDocument, localizeHtmlResponse };
