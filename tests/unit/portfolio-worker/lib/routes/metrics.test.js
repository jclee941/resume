/**
 * @file Unit tests for routes/metrics.js
 * @description Tests for generateMetricsPostRoute, generateMetricsGetRoute, generateMetricsSnapshotRoute
 */

const {
  generateMetricsPostRoute,
  generateMetricsGetRoute,
  generateMetricsSnapshotRoute,
} = require('../../../../../typescript/portfolio-worker/lib/routes/metrics');

describe('routes/metrics', () => {
  describe('generateMetricsPostRoute', () => {
    it('returns a string', () => {
      const result = generateMetricsPostRoute();
      expect(typeof result).toBe('string');
    });

    it('contains /api/metrics POST route', () => {
      const result = generateMetricsPostRoute();
      expect(result).toContain('/api/metrics');
      expect(result).toContain('POST');
    });

    it('checks content-type for non-JSON', () => {
      const result = generateMetricsPostRoute();
      expect(result).toContain('application/json');
    });

    it('returns 415 for non-JSON', () => {
      const result = generateMetricsPostRoute();
      expect(result).toContain('415');
    });

    it('validates metricsData is object', () => {
      const result = generateMetricsPostRoute();
      expect(result).toContain('metricsData');
    });

    it('returns status ok', () => {
      const result = generateMetricsPostRoute();
      expect(result).toContain('ok');
    });
  });

  describe('generateMetricsGetRoute', () => {
    it('returns a string', () => {
      const result = generateMetricsGetRoute();
      expect(typeof result).toBe('string');
    });

    it('contains /api/metrics GET route', () => {
      const result = generateMetricsGetRoute();
      expect(result).toContain('/api/metrics');
      expect(result).toContain('GET');
    });

    it('returns health/http/vitals/tracking summary', () => {
      const result = generateMetricsGetRoute();
      expect(result).toContain('health');
    });

    it('sets Cache-Control header', () => {
      const result = generateMetricsGetRoute();
      expect(result).toContain('Cache-Control');
    });

    it('sets max-age=60', () => {
      const result = generateMetricsGetRoute();
      expect(result).toContain('max-age=60');
    });
  });

  describe('generateMetricsSnapshotRoute', () => {
    it('returns a string', () => {
      const result = generateMetricsSnapshotRoute();
      expect(typeof result).toBe('string');
    });

    it('contains /api/metrics/snapshot route', () => {
      const result = generateMetricsSnapshotRoute();
      expect(result).toContain('/api/metrics/snapshot');
    });

    it('checks content-type for non-JSON', () => {
      const result = generateMetricsSnapshotRoute();
      expect(result).toContain('application/json');
    });

    it('returns 415 for non-JSON', () => {
      const result = generateMetricsSnapshotRoute();
      expect(result).toContain('415');
    });

    it('calculates snapshot metrics', () => {
      const result = generateMetricsSnapshotRoute();
      expect(result).toContain('uptime');
    });

    it('uses DB.prepare for INSERT', () => {
      const result = generateMetricsSnapshotRoute();
      expect(result).toContain('DB');
      expect(result).toContain('prepare');
    });

    it('returns snapshot saved status', () => {
      const result = generateMetricsSnapshotRoute();
      expect(result).toContain('saved');
    });
  });
});
