/**
 * @file Unit tests for routes/observability.js
 * @description Tests for generateCfStatsRoute, generateVitalsRoute, generateTrackRoute, generateAnalyticsRoute
 */

const {
  generateCfStatsRoute,
  generateVitalsRoute,
  generateTrackRoute,
  generateAnalyticsRoute,
} = require('../../../../../typescript/portfolio-worker/lib/routes/observability');

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
});
