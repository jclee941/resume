'use strict';

/**
 * Generate static file routes (manifest, sw, main.js).
 * Lines 637-667 of original template.
 */
function generateStaticRoutes() {
  return `
      if (url.pathname === '/manifest.json' || url.pathname === '/manifest_en.json') {
        const isEnglish = url.pathname === '/manifest_en.json';
        const manifestContent = isEnglish ? MANIFEST_EN_JSON : MANIFEST_JSON;
        metrics.requests_success++;
        return new Response(manifestContent, {
          headers: {
            ...applyNonceToHeaders(SECURITY_HEADERS, ""),
            ...CACHE_POLICIES.static,
            ...rateLimitHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      if (url.pathname === '/sw.js' || url.pathname === '/en/sw.js') {
        metrics.requests_success++;
        return new Response(SERVICE_WORKER, {
          headers: {
            ...applyNonceToHeaders(SECURITY_HEADERS, ""),
            ...CACHE_POLICIES.static,
            ...rateLimitHeaders,
            'Content-Type': 'application/javascript',
            'Service-Worker-Allowed': '/'
          }
        });
      }

      if (url.pathname === '/main.js') {
        metrics.requests_success++;
        return new Response(MAIN_JS, {
          headers: {
            ...applyNonceToHeaders(SECURITY_HEADERS, ""),
            ...CACHE_POLICIES.static,
            ...rateLimitHeaders,
            'Content-Type': 'application/javascript'
          }
        });
      }`;
}

module.exports = { generateStaticRoutes };
