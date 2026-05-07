'use strict';

/**
 * Generate Prometheus metrics route.
 * Lines 714-723 of original template.
 */
function generateMetricsRoute() {
  return `
       if (url.pathname === '/metrics') {
        metrics.requests_success++;
        return new Response(generateMetrics(metrics), {
          headers: {
            ...applyNonceToHeaders(SECURITY_HEADERS, ""),
            ...rateLimitHeaders,
            'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
            ...CACHE_POLICIES.api
          }
        });
      }`;
}

module.exports = { generateMetricsRoute };
