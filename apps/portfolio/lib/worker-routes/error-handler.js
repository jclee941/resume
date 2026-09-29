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
      console.error('[worker ${opts.version}] ' + request.method + ' ' + url.pathname + ' failed:', err && err.stack ? err.stack : err);

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
