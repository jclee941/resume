// @ts-check
/**
 * GlitchTip/Sentry error tracking integration for job-server.
 * GlitchTip is Sentry-compatible, so we use the @sentry/node SDK.
 *
 * Setup:
 *   1. Install: npm install @sentry/node -w @resume/job-automation
 *   2. Set GLITCHTIP_DSN environment variable
 *   3. Call initErrorTracking() before server start
 */

/**
 * Initialize error tracking with GlitchTip.
 * @param {object} options
 * @param {string} [options.dsn] - GlitchTip DSN (falls back to GLITCHTIP_DSN env var)
 * @param {string} [options.environment] - Environment name (default: 'production')
 * @param {string} [options.release] - Release version
 * @returns {{ captureException: (err: Error, context?: object) => void, captureMessage: (msg: string, level?: string) => void, flush: () => Promise<void> }}
 */
export async function initErrorTracking({ dsn, environment = 'production', release } = {}) {
  const resolvedDsn = dsn || process.env.GLITCHTIP_DSN;

  if (!resolvedDsn) {
    console.warn('[error-tracking] GLITCHTIP_DSN not set — error tracking disabled');
    return {
      captureException: (err, context) => {
        console.error('[error-tracking:noop] Exception:', err.message, context);
      },
      captureMessage: (msg, level) => {
        console.log(`[error-tracking:noop] ${level || 'info'}: ${msg}`);
      },
      flush: async () => {},
    };
  }

  /** @type {typeof import('@sentry/node')} */
  let Sentry;
  try {
    // Dynamic import for graceful degradation
    Sentry = await import('@sentry/node');
  } catch {
    console.warn('[error-tracking] @sentry/node not installed — run: npm install @sentry/node -w @resume/job-automation');
    return {
      captureException: (err, context) => {
        console.error('[error-tracking:fallback] Exception:', err.message, context);
      },
      captureMessage: (msg, level) => {
        console.log(`[error-tracking:fallback] ${level || 'info'}: ${msg}`);
      },
      flush: async () => {},
    };
  }

  Sentry.init({
    dsn: resolvedDsn,
    environment,
    release,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      // Strip sensitive data
      if (event.request?.cookies) {
        event.request.cookies = {};
      }
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      return event;
    },
  });

  console.log(`[error-tracking] Initialized (env: ${environment})`);

  return {
    captureException: (err, context) => {
      Sentry.captureException(err, context ? { extra: context } : undefined);
    },
    captureMessage: (msg, level = 'info') => {
      Sentry.captureMessage(msg, level);
    },
    flush: () => Sentry.close(2000),
  };
}

/**
 * Create a Fastify error handler plugin that reports errors to GlitchTip.
 * @param {ReturnType<typeof initErrorTracking>} tracker
 * @returns {import('fastify').FastifyPluginCallback}
 */
export function errorTrackingPlugin(tracker) {
  return function plugin(fastify, _opts, done) {
    fastify.addHook('onError', (request, _reply, error, done) => {
      tracker.captureException(error, {
        url: request.url,
        method: request.method,
        params: request.params,
        ip: request.ip,
      });
      done();
    });

    fastify.addHook('onClose', async () => {
      await tracker.flush();
    });

    done();
  };
}
