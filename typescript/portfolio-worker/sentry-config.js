// Sentry Client-Side Configuration
// This file is embedded in index.html for browser error tracking

(function initSentry() {
  // Sentry DSN - replace with your actual DSN from sentry.io
  // For now, using a placeholder (set SENTRY_DSN in environment)
  const SENTRY_DSN =
    typeof SENTRY_DSN_PLACEHOLDER !== 'undefined'
      ? SENTRY_DSN_PLACEHOLDER
      : null;

  if (!SENTRY_DSN) {
    console.log('Sentry DSN not configured - error tracking disabled');
    return;
  }

  // Initialize Sentry
  Sentry.init({
    dsn: SENTRY_DSN,

    // Environment (production/staging/development)
    environment: (() => {
      const hostname = window.location.hostname;
      if (hostname === 'resume.jclee.me') return 'production';
      if (hostname.includes('staging') || hostname.includes('workers.dev'))
        return 'staging';
      return 'development';
    })(),

    // Release version (static for deterministic CSP hashes)
    release: 'resume@production',

    // Sample rate for performance monitoring (10% of transactions)
    tracesSampleRate: 0.1,

    // Sample rate for error reporting (100% - capture all errors)
    sampleRate: 1.0,

    // Ignore common browser errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'chrome-extension',
      'moz-extension',
      // Network errors
      'NetworkError',
      'Failed to fetch',
      'Load failed',
      // Service Worker errors
      'ServiceWorker',
      // Cloudflare injected errors
      'cf-mirage',
      'cf-chl',
    ],

    // Deny URLs (don't report errors from these sources)
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
      /cloudflare\.com/i,
    ],

    // Before send hook - filter out PII
    beforeSend(event, hint) {
      // Remove user IP address
      if (event.user) {
        delete event.user.ip_address;
      }

      // Remove URLs with sensitive data
      if (event.request && event.request.url) {
        const url = new URL(event.request.url);
        // Remove query parameters that might contain PII
        url.search = '';
        event.request.url = url.toString();
      }

      return event;
    },

    // Breadcrumbs configuration
    maxBreadcrumbs: 50,

    // Attach stacktrace to messages
    attachStacktrace: true,
  });

  // Set user context (anonymous)
  Sentry.setUser({ id: 'anonymous' });

  // Set tags
  Sentry.setTag('page', window.location.pathname);
  Sentry.setTag('user_agent', navigator.userAgent);

  // Add global error handlers
  window.addEventListener('error', (event) => {
    Sentry.captureException(event.error || event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    Sentry.captureException(event.reason);
  });

  console.log('✅ Sentry initialized:', {
    environment: Sentry.getCurrentHub().getClient().getOptions().environment,
    release: Sentry.getCurrentHub().getClient().getOptions().release,
  });
})();
