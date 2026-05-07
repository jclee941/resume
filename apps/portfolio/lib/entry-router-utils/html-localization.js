import { DEFAULT_LANGUAGE, HREFLANG_LINKS, SUPPORTED_LANGUAGES } from './constants.js';

function localizeHtmlDocument(html, language) {
  const localized = SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;
  const htmlWithLang = /<html[^>]*\slang=["'][^"']*["'][^>]*>/i.test(html)
    ? html.replace(/(<html[^>]*\slang=["'])[^"']*(["'][^>]*>)/i, `$1${localized}$2`)
    : html.replace(/<html([^>]*)>/i, `<html lang="${localized}"$1>`);

  const htmlWithoutAlternates = htmlWithLang.replace(
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

async function localizeHtmlResponse(response, language) {
  const html = await response.text();
  const headers = new Headers(response.headers);
  const localizedHtml = localizeHtmlDocument(html, language);

  return new Response(localizedHtml, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export { isHtmlResponse, localizeHtmlDocument, localizeHtmlResponse };
