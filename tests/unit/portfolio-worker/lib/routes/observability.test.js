/**
 * @file Unit tests for routes/observability.js
 * @description Tests for generateCfStatsRoute, generateVitalsRoute, generateTrackRoute, generateAnalyticsRoute, generateCspViolationRoute
 */

const {
  generateCfStatsRoute,
  generateVitalsRoute,
  generateTrackRoute,
  generateAnalyticsRoute,
  generateCspViolationRoute,
} = require('../../../../../apps/portfolio/lib/routes/observability');

describe('routes/observability', () => {
  describe('generateCfStatsRoute', () => {
    it('returns a string', () => {
      const result = generateCfStatsRoute();
      expect(typeof result).toBe('string');
    });

    it('contains /api/cf/stats route', () => {
      const result = generateCfStatsRoute();
      expect(result).toContain('/api/cf/stats');
    });

    it('requires session verification', () => {
      const result = generateCfStatsRoute();
      expect(result).toContain('verifySession');
    });

    it('returns 401 for unauthenticated', () => {
      const result = generateCfStatsRoute();
      expect(result).toContain('401');
    });

    it('uses CF_API_KEY and CF_EMAIL from env', () => {
      const result = generateCfStatsRoute();
      expect(result).toContain('CF_API_KEY');
      expect(result).toContain('CF_EMAIL');
    });

    it('calls getCFZoneId', () => {
      const result = generateCfStatsRoute();
      expect(result).toContain('getCFZoneId');
    });

    it('returns 404 when zone not found', () => {
      const result = generateCfStatsRoute();
      expect(result).toContain('404');
    });

    it('calls getCFStats', () => {
      const result = generateCfStatsRoute();
      expect(result).toContain('getCFStats');
    });
  });

  describe('generateVitalsRoute', () => {
    it('returns a string', () => {
      const result = generateVitalsRoute();
      expect(typeof result).toBe('string');
    });

    it('contains /api/vitals route', () => {
      const result = generateVitalsRoute();
      expect(result).toContain('/api/vitals');
    });

    it('checks content-type for non-JSON', () => {
      const result = generateVitalsRoute();
      expect(result).toContain('application/json');
    });

    it('returns 415 for non-JSON', () => {
      const result = generateVitalsRoute();
      expect(result).toContain('415');
    });

    it('validates vitals is object', () => {
      const result = generateVitalsRoute();
      expect(result).toContain('vitals');
    });

    it('validates LCP and FID >= 0', () => {
      const result = generateVitalsRoute();
      expect(result).toContain('LCP');
      expect(result).toContain('FID');
    });

    it('validates CLS between 0 and 1', () => {
      const result = generateVitalsRoute();
      expect(result).toContain('CLS');
    });

    it('increments vitals_received metric', () => {
      const result = generateVitalsRoute();
      expect(result).toContain('vitals_received');
    });

    it('returns status ok', () => {
      const result = generateVitalsRoute();
      expect(result).toContain('ok');
    });
  });

  describe('generateTrackRoute', () => {
    it('returns a string', () => {
      const result = generateTrackRoute();
      expect(typeof result).toBe('string');
    });

    it('contains /api/track route', () => {
      const result = generateTrackRoute();
      expect(result).toContain('/api/track');
    });

    it('checks content-type for non-JSON', () => {
      const result = generateTrackRoute();
      expect(result).toContain('application/json');
    });

    it('returns 415 for non-JSON', () => {
      const result = generateTrackRoute();
      expect(result).toContain('415');
    });

    it('validates trackingData is object', () => {
      const result = generateTrackRoute();
      expect(result).toContain('trackingData');
    });

    it('requires event field', () => {
      const result = generateTrackRoute();
      expect(result).toContain('event');
    });

    it('returns 204 status', () => {
      const result = generateTrackRoute();
      expect(result).toContain('204');
    });
  });

  describe('generateAnalyticsRoute', () => {
    it('returns a string', () => {
      const result = generateAnalyticsRoute();
      expect(typeof result).toBe('string');
    });

    it('contains /api/analytics route', () => {
      const result = generateAnalyticsRoute();
      expect(result).toContain('/api/analytics');
    });

    it('checks content-type for non-JSON', () => {
      const result = generateAnalyticsRoute();
      expect(result).toContain('application/json');
    });

    it('returns 415 for non-JSON', () => {
      const result = generateAnalyticsRoute();
      expect(result).toContain('415');
    });

    it('validates analyticsData is object', () => {
      const result = generateAnalyticsRoute();
      expect(result).toContain('analyticsData');
    });

    it('returns status ok', () => {
      const result = generateAnalyticsRoute();
      expect(result).toContain('ok');
    });
  });

  describe('generateCspViolationRoute', () => {
    it('returns a string', () => {
      const result = generateCspViolationRoute();
      expect(typeof result).toBe('string');
    });

    it('contains /api/csp-violation route', () => {
      const result = generateCspViolationRoute();
      expect(result).toContain('/api/csp-violation');
    });

    it('returns 204 status', () => {
      const result = generateCspViolationRoute();
      expect(result).toContain('204');
    });

    it('logs to Elasticsearch with WARN level', () => {
      const result = generateCspViolationRoute();
      expect(result).toContain('WARN');
    });

    it('handles both legacy and modern CSP report formats', () => {
      const result = generateCspViolationRoute();
      expect(result).toContain('csp-report');
      expect(result).toContain('violated-directive');
      expect(result).toContain('blocked-uri');
    });

    it('accepts the modern Reporting API content type', () => {
      const result = generateCspViolationRoute();
      expect(result).toContain('application/reports+json');
      expect(result).toContain('application/csp-report');
    });

    it('normalizes the Reporting API array body (report[].body.blockedURL)', () => {
      const result = generateCspViolationRoute();
      expect(result).toContain('Array.isArray');
      expect(result).toContain('blockedURL');
      expect(result).toContain('effectiveDirective');
    });
  });

  describe('generateCspViolationRoute execution (Reporting API payload)', () => {
    async function runReport(contentType, body) {
      const logged = [];
      const fn = new Function(
        'request',
        'url',
        'env',
        'ctx',
        'metrics',
        'SECURITY_HEADERS',
        'rateLimitHeaders',
        'corsHeaders',
        'logToElasticsearch',
        'hasJsonContentType',
        `return (async () => {${generateCspViolationRoute()}\n return null;})();`
      );
      const request = {
        method: 'POST',
        headers: { get: (h) => (h === 'Content-Type' ? contentType : '') },
        json: async () => body,
      };
      const logToElasticsearch = (_e, msg, _lvl, fields) => {
        logged.push({ msg, fields });
      };
      // The route returns 204 with a null body, which native Response accepts.
      const res = await fn(
        request,
        { pathname: '/api/csp-violation' },
        {},
        { waitUntil: (p) => p },
        { requests_success: 0 },
        {},
        {},
        {},
        logToElasticsearch,
        (req) => (req.headers.get('Content-Type') || '').includes('application/json'),
        globalThis.Response
      );
      return { res, logged };
    }

    it('logs a normalized blockedURL from a Reporting API array', async () => {
      const { res, logged } = await runReport('application/reports+json', [
        {
          type: 'csp-violation',
          url: 'https://resume.jclee.me/',
          body: { blockedURL: 'https://evil.example/x.js', effectiveDirective: 'script-src' },
        },
      ]);
      expect(res.status).toBe(204);
      expect(logged.length).toBe(1);
      expect(logged[0].fields.blockedUri).toBe('https://evil.example/x.js');
      expect(logged[0].fields.violatedDirective).toBe('script-src');
    });

    it('still logs a legacy report-uri csp-report body', async () => {
      const { logged } = await runReport('application/csp-report', {
        'csp-report': {
          'blocked-uri': 'https://legacy.example/y.js',
          'violated-directive': 'style-src',
        },
      });
      expect(logged.length).toBe(1);
      expect(logged[0].fields.blockedUri).toBe('https://legacy.example/y.js');
    });
  });
});
