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
      return new Response('Not Found', {
        status: 404,
        headers: {
          ...applyNonceToHeaders(SECURITY_HEADERS, ""),
          ...rateLimitHeaders,
          'Content-Type': 'text/plain',
          ...CACHE_POLICIES.api
        }
      });`;
}

module.exports = { generate404, generateFaviconRedirect };
