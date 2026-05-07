'use strict';

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
        route: url.pathname,
        traceparent: request.headers.get('traceparent') || undefined,
        tracestate: request.headers.get('tracestate') || undefined,
      }, { immediate: true }));

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
          ...applyNonceToHeaders(SECURITY_HEADERS, ""),
          ...rateLimitHeaders,
          'Content-Type': 'text/plain',
          ...CACHE_POLICIES.api
        }
      });
    }
  }
};`;
}

module.exports = { generateErrorHandler };
