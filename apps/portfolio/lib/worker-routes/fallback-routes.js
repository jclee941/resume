'use strict';

/**
 * Generate 404 handler.
 * Lines 1052-1061 of original template.
 */
function generateFaviconRedirect() {
  return `
      if (url.pathname === '/favicon.ico') {
        return Response.redirect(new URL('/assets/favicon.svg', request.url).toString(), 308);
      }`;
}

/**
 * Generate 404 handler.
 * Lines 1052-1061 of original template.
 */
function generate404() {
  return `
      // 404 Not Found
      metrics.requests_error++;
      const isPageRequest = request.method === 'GET' &&
        !/^\\/(?:api|assets|fonts)(?:\\/|$)/.test(url.pathname) &&
        !/\\.[^/]+$/.test(url.pathname);
      const notFoundHtml = \`<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="robots" content="noindex">
  <title>404 Not Found · 페이지를 찾을 수 없습니다</title>
</head>
<body>
  <main>
    <h1>404</h1>
    <p>페이지를 찾을 수 없습니다 · Page not found · ページが見つかりません</p>
    <nav aria-label="Language">
      <a href="/">포트폴리오 홈</a>
      <a href="/en/">English</a>
      <a href="/ja/">日本語</a>
    </nav>
  </main>
</body>
</html>\`;
      return new Response(isPageRequest ? notFoundHtml : 'Not Found', {
        status: 404,
        headers: {
          ...applyNonceToHeaders(SECURITY_HEADERS, ""),
          ...rateLimitHeaders,
          'Content-Type': isPageRequest ? 'text/html; charset=utf-8' : 'text/plain',
          ...CACHE_POLICIES.api
        }
      });`;
}

module.exports = { generate404, generateFaviconRedirect };
