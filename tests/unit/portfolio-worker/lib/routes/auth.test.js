/**
 * @file Unit tests for routes/auth.js
 * @description Tests for generateAuthRoutes and generateControlRoutes code generators
 */

const {
  generateAuthRoutes,
  generateControlRoutes,
} = require('../../../../../typescript/portfolio-worker/lib/routes/auth');

describe('routes/auth', () => {
  describe('generateAuthRoutes', () => {
    const opts = { allowedEmailsJson: '["user@example.com","admin@test.com"]' };

    it('returns a string', () => {
      const result = generateAuthRoutes(opts);
      expect(typeof result).toBe('string');
    });

    it('contains /api/auth/google route', () => {
      const result = generateAuthRoutes(opts);
      expect(result).toContain('/api/auth/google');
    });

    it('contains /api/auth/status route', () => {
      const result = generateAuthRoutes(opts);
      expect(result).toContain('/api/auth/status');
    });

    it('interpolates allowedEmailsJson', () => {
      const result = generateAuthRoutes(opts);
      expect(result).toContain('user@example.com');
      expect(result).toContain('admin@test.com');
    });

    it('checks content-type for non-JSON', () => {
      const result = generateAuthRoutes(opts);
      expect(result).toContain('application/json');
    });

    it('returns 415 for non-JSON content type', () => {
      const result = generateAuthRoutes(opts);
      expect(result).toContain('415');
    });

    it('handles verifyGoogleToken', () => {
      const result = generateAuthRoutes(opts);
      expect(result).toContain('verifyGoogleToken');
    });

    it('returns 403 for unauthorized email', () => {
      const result = generateAuthRoutes(opts);
      expect(result).toContain('403');
    });

    it('returns 401 for invalid token', () => {
      const result = generateAuthRoutes(opts);
      expect(result).toContain('401');
    });

    it('handles session cookie with SIGNING_SECRET', () => {
      const result = generateAuthRoutes(opts);
      expect(result).toContain('SIGNING_SECRET');
    });

    it('returns 503 when no signing secret', () => {
      const result = generateAuthRoutes(opts);
      expect(result).toContain('503');
    });

    it('contains verifySession for status route', () => {
      const result = generateAuthRoutes(opts);
      expect(result).toContain('verifySession');
    });

    it('returns authenticated status', () => {
      const result = generateAuthRoutes(opts);
      expect(result).toContain('authenticated');
    });
  });

  describe('generateControlRoutes', () => {
    it('returns a string', () => {
      const result = generateControlRoutes();
      expect(typeof result).toBe('string');
    });

    it('contains /api/ai/run-system route', () => {
      const result = generateControlRoutes();
      expect(result).toContain('/api/ai/run-system');
    });

    it('requires session verification', () => {
      const result = generateControlRoutes();
      expect(result).toContain('verifySession');
    });

    it('returns 401 for unauthenticated', () => {
      const result = generateControlRoutes();
      expect(result).toContain('401');
    });

    it('checks content-type for non-JSON', () => {
      const result = generateControlRoutes();
      expect(result).toContain('application/json');
    });

    it('returns 415 for non-JSON', () => {
      const result = generateControlRoutes();
      expect(result).toContain('415');
    });

    it('references N8N webhook', () => {
      const result = generateControlRoutes();
      expect(result).toContain('N8N_WEBHOOK_BASE');
    });

    it('handles errors with 500', () => {
      const result = generateControlRoutes();
      expect(result).toContain('500');
    });
  });
});
