'use strict';

/**
 * Generate fetch handler preamble + rate limiting.
 * Lines 455-483 of original template.
 */
function generateFetchAndRateLimit() {
  return `
export default {
  async fetch(request, env, ctx) {
    const startTime = Date.now();
    const url = new URL(request.url);
    const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
    const isLocalDevHost =
      url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname === '::1';

    metrics.requests_total++;

    const rateLimitStatus = isLocalDevHost
      ? {
          allowed: true,
          remaining: 999999,
          limit: 999999,
          resetAt: Date.now() + 60 * 1000,
        }
      : checkRateLimit(clientIp, url.pathname);
    const rateLimitHeaders = getRateLimitHeaders(rateLimitStatus);
    const corsHeaders = getCorsHeaders(request, url.pathname);

    const preflightResponse = createPreflightResponse(request, url.pathname);
    if (preflightResponse) {
      const preflightHeaders = new Headers(preflightResponse.headers);
      Object.entries(rateLimitHeaders).forEach(([name, value]) => preflightHeaders.set(name, value));
      return new Response(preflightResponse.body, {
        status: preflightResponse.status,
        headers: preflightHeaders,
      });
    }

    if (!rateLimitStatus.allowed) {
        return new Response(JSON.stringify({ error: 'Too Many Requests' }), {
          status: 429,
          headers: {
            ...applyNonceToHeaders(SECURITY_HEADERS, ""),
            ...rateLimitHeaders,
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': getRetryAfterSeconds(rateLimitStatus.resetAt),
          }
        });
    }

    try {`;
}

module.exports = { generateFetchAndRateLimit };
