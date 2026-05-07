'use strict';

/**
 * Generate localized page routes.
 * Lines 485-520 of original template.
 */
function generatePageRoutes() {
  return `
      // Static Assets (Fonts, etc.)
      if (url.pathname.startsWith('/assets/') && env.ASSETS) {
        const assetPath = url.pathname.replace('/assets/', '/');
        const assetUrl = new URL(assetPath, request.url);
        const assetResponse = await env.ASSETS.fetch(new Request(assetUrl, request));
        const headers = new Headers(assetResponse.headers);
        Object.entries(CACHE_POLICIES.static).forEach(([name, value]) => headers.set(name, value));
        Object.entries(rateLimitHeaders).forEach(([name, value]) => headers.set(name, value));
        return new Response(assetResponse.body, {
          status: assetResponse.status,
          statusText: assetResponse.statusText,
          headers,
        });
      }

       // Routing

      if (url.pathname === '/') {
        const nonce = generateCspNonce();
        const response = new Response(applyNonceToHtml(INDEX_HTML, nonce), {
          headers: {
            ...applyNonceToHeaders(SECURITY_HEADERS, nonce),
            ...CACHE_POLICIES.html,
            ...rateLimitHeaders
          }
        });
        metrics.requests_success++;
        metrics.response_time_sum += (Date.now() - startTime);

        ctx.waitUntil(logToElasticsearch(env, \`Request: \${request.method} \${url.pathname}\`, 'INFO', {
          route: url.pathname,
          traceparent: request.headers.get('traceparent') || undefined,
          tracestate: request.headers.get('tracestate') || undefined,
        }, { immediate: true }));

        return response;
      }

      // Japanese version route
      if (url.pathname === '/ja/' || url.pathname === '/ja') {
        const nonce = generateCspNonce();
        const response = new Response(applyNonceToHtml(INDEX_JA_HTML, nonce), {
          headers: {
            ...applyNonceToHeaders(SECURITY_HEADERS, nonce),
            ...CACHE_POLICIES.html,
            ...rateLimitHeaders
          }
        });
        metrics.requests_success++;
        metrics.response_time_sum += (Date.now() - startTime);

        ctx.waitUntil(logToElasticsearch(env, \`Request: \${request.method} \${url.pathname}\`, 'INFO', {
          route: url.pathname,
          traceparent: request.headers.get('traceparent') || undefined,
          tracestate: request.headers.get('tracestate') || undefined,
        }, { immediate: true }));

        return response;
      }

      // English version route
      if (url.pathname === '/en/' || url.pathname === '/en') {
        const nonce = generateCspNonce();
        const response = new Response(applyNonceToHtml(INDEX_EN_HTML, nonce), {
          headers: {
            ...applyNonceToHeaders(SECURITY_HEADERS, nonce),
            ...CACHE_POLICIES.html,
            ...rateLimitHeaders
          }
        });
        metrics.requests_success++;
        metrics.response_time_sum += (Date.now() - startTime);

        ctx.waitUntil(logToElasticsearch(env, \`Request: \${request.method} \${url.pathname}\`, 'INFO', {
          route: url.pathname,
          traceparent: request.headers.get('traceparent') || undefined,
          tracestate: request.headers.get('tracestate') || undefined,
        }, { immediate: true }));

        return response;
      }`;
}

module.exports = { generatePageRoutes };
