/**
 * Worker route generators for non-API routes.
 * Extracted from generate-worker.js template literal.
 *
 * Each function returns a string fragment (raw worker code).
 * Build-time interpolation uses opts.*, runtime escaping is verbatim.
 */

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

    metrics.requests_total++;

    const rateLimitStatus = checkRateLimit(clientIp, url.pathname);
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
            ...SECURITY_HEADERS,
            ...rateLimitHeaders,
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': getRetryAfterSeconds(rateLimitStatus.resetAt),
          }
        });
    }

    try {`;
}

/**
 * Generate page and asset routes.
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
        const response = new Response(INDEX_HTML, {
          headers: {
            ...SECURITY_HEADERS,
            ...CACHE_POLICIES.html,
            ...rateLimitHeaders
          }
        });
        metrics.requests_success++;
        metrics.response_time_sum += (Date.now() - startTime);

        ctx.waitUntil(logToElasticsearch(env, \`Request: \${request.method} \${url.pathname}\`, 'INFO', {
          route: url.pathname
        }));

        return response;
      }

      // English version route
      if (url.pathname === '/en/' || url.pathname === '/en') {
        const response = new Response(INDEX_EN_HTML, {
          headers: {
            ...SECURITY_HEADERS,
            ...CACHE_POLICIES.html,
            ...rateLimitHeaders
          }
        });
        metrics.requests_success++;
        metrics.response_time_sum += (Date.now() - startTime);

        ctx.waitUntil(logToElasticsearch(env, \`Request: \${request.method} \${url.pathname}\`, 'INFO', {
          route: url.pathname
        }));

        return response;
      }`;
}

/**
 * Generate static file routes (manifest, sw, main.js).
 * Lines 637-667 of original template.
 */
function generateStaticRoutes() {
  return `
      if (url.pathname === '/manifest.json') {
        metrics.requests_success++;
        return new Response(MANIFEST_JSON, {
          headers: {
            ...SECURITY_HEADERS,
            ...CACHE_POLICIES.static,
            ...rateLimitHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      if (url.pathname === '/sw.js') {
        metrics.requests_success++;
        return new Response(SERVICE_WORKER, {
          headers: {
            ...SECURITY_HEADERS,
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
            ...SECURITY_HEADERS,
            ...CACHE_POLICIES.static,
            ...rateLimitHeaders,
            'Content-Type': 'application/javascript'
          }
        });
      }`;
}

/**
 * Generate health check route.
 * Lines 669-712 of original template.
 * @param {Object} opts
 * @param {string} opts.version - Build-time VERSION
 * @param {string} opts.deployedAt - Build-time deployedAt
 */
function generateHealthRoute(opts) {
  return `
      if (url.pathname === '/health') {
        const uptime = Math.floor((Date.now() - metrics.worker_start_time) / 1000);

        const bindings = { d1: { healthy: false }, kv: { healthy: false } };
        try {
          const d1Start = Date.now();
          await env.DB.prepare('SELECT 1 AS ok').first();
          bindings.d1 = { healthy: true, latency_ms: Date.now() - d1Start };
        } catch (e) {
          bindings.d1 = { healthy: false, error: e.message };
        }
        try {
          const kvStart = Date.now();
          await env.SESSIONS.put('_health_check', Date.now().toString());
          await env.SESSIONS.get('_health_check');
          bindings.kv = { healthy: true, latency_ms: Date.now() - kvStart };
        } catch (e) {
          bindings.kv = { healthy: false, error: e.message };
        }

        const allHealthy = bindings.d1.healthy && bindings.kv.healthy;
        const health = {
          status: allHealthy ? 'healthy' : 'degraded',
          version: '${opts.version}',
          deployed_at: '${opts.deployedAt}',
          uptime_seconds: uptime,
          bindings,
          metrics: {
            requests_total: metrics.requests_total,
            requests_success: metrics.requests_success,
            requests_error: metrics.requests_error,
            vitals_received: metrics.vitals_received
          }
        };

        metrics.requests_success++;
        return new Response(JSON.stringify(health, null, 2), {
          headers: {
            ...SECURITY_HEADERS,
            ...rateLimitHeaders,
            'Content-Type': 'application/json',
            ...CACHE_POLICIES.api
          }
        });
      }`;
}

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
            ...SECURITY_HEADERS,
            ...rateLimitHeaders,
            'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
            ...CACHE_POLICIES.api
          }
        });
      }`;
}

/**
 * Generate SEO and binary asset routes.
 * Lines 995-1050 of original template.
 */
function generateSeoRoutes() {
  return `
      if (url.pathname === '/robots.txt') {
        metrics.requests_success++;
        return new Response(ROBOTS_TXT, {
          headers: {
            ...SECURITY_HEADERS,
            ...CACHE_POLICIES.static,
            ...rateLimitHeaders,
            'Content-Type': 'text/plain'
          }
        });
      }

      if (url.pathname === '/sitemap.xml') {
        metrics.requests_success++;
        return new Response(SITEMAP_XML, {
          headers: {
            ...SECURITY_HEADERS,
            ...CACHE_POLICIES.static,
            ...rateLimitHeaders,
            'Content-Type': 'application/xml'
          }
        });
      }

      if (url.pathname === '/og-image.webp') {
        const imageBuffer = Uint8Array.from(atob(OG_IMAGE_BASE64), c => c.charCodeAt(0));
        metrics.requests_success++;
        return new Response(imageBuffer, {
          headers: {
            ...SECURITY_HEADERS,
            ...CACHE_POLICIES.static,
            ...rateLimitHeaders,
            'Content-Type': 'image/webp',
          }
        });
      }

      if (url.pathname === '/og-image-en.webp') {
        const imageBuffer = Uint8Array.from(atob(OG_IMAGE_EN_BASE64), c => c.charCodeAt(0));
        metrics.requests_success++;
        return new Response(imageBuffer, {
          headers: {
            ...SECURITY_HEADERS,
            ...CACHE_POLICIES.static,
            ...rateLimitHeaders,
            'Content-Type': 'image/webp',
          }
        });
      }

      if (url.pathname === '/resume.pdf') {
        const pdfBuffer = Uint8Array.from(atob(RESUME_PDF_BASE64), c => c.charCodeAt(0));
        metrics.requests_success++;
        return new Response(pdfBuffer, {
          headers: {
            ...SECURITY_HEADERS,
            ...CACHE_POLICIES.static,
            ...rateLimitHeaders,
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline; filename="resume_jclee.pdf"'
          }
        });
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
          ...SECURITY_HEADERS,
          ...rateLimitHeaders,
          'Content-Type': 'text/plain',
          ...CACHE_POLICIES.api
        }
      });`;
}

/**
 * Generate error handler (catch block) + close fetch handler.
 * Lines 1063-1098 of original template.
 * @param {Object} opts
 * @param {string} opts.version - Build-time VERSION
 */
function generateErrorHandler(opts) {
  return `
    } catch (err) {
      metrics.requests_error++;
      ctx.waitUntil(logToElasticsearch(env, \`Error: \${err.message}\`, 'ERROR', {
        route: url.pathname
      }));

      ctx.waitUntil((async () => {
        try {
          await env.DB.prepare(
            'INSERT INTO error_logs (message, stack, url, method, status_code, client_ip, country, colo, worker_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
          ).bind(
            err.message || 'Unknown error',
            err.stack || '',
            url.pathname,
            request.method,
            500,
            clientIp,
            request.cf?.country || '',
            request.cf?.colo || '',
            '${opts.version}'
          ).run();
        } catch (dbErr) {
          console.error('[D1] Error log INSERT failed:', dbErr.message || dbErr);
        }
      })());

      return new Response('Internal Server Error', {
        status: 500,
        headers: {
          ...SECURITY_HEADERS,
          ...rateLimitHeaders,
          'Content-Type': 'text/plain',
          ...CACHE_POLICIES.api
        }
      });
    }
  }
};`;
}

module.exports = {
  generateFetchAndRateLimit,
  generatePageRoutes,
  generateStaticRoutes,
  generateHealthRoute,
  generateMetricsRoute,
  generateSeoRoutes,
  generate404,
  generateErrorHandler,
};
