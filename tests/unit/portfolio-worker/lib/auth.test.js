'use strict';

const {
  verifyGoogleToken,
  signMessage,
  verifyMessage,
  verifySession,
  getCFZoneId,
  getCFStats,
  generateAuthHelpers,
} = require('../../../../typescript/portfolio-worker/lib/auth');

describe('auth', () => {
  describe('verifyGoogleToken', () => {
    let code;
    beforeAll(() => {
      code = verifyGoogleToken();
    });

    it('should return a string', () => {
      expect(typeof code).toBe('string');
      expect(code.length).toBeGreaterThan(0);
    });

    it('should contain async function declaration', () => {
      expect(code).toContain('async function verifyGoogleToken');
    });

    it('should reference Google OAuth2 tokeninfo endpoint', () => {
      expect(code).toContain('oauth2.googleapis.com/tokeninfo');
    });

    it('should be valid JavaScript syntax', () => {
      expect(() => new Function(code)).not.toThrow();
    });
  });

  describe('signMessage', () => {
    let code;
    beforeAll(() => {
      code = signMessage();
    });

    it('should return a string', () => {
      expect(typeof code).toBe('string');
    });

    it('should contain async function declaration', () => {
      expect(code).toContain('async function signMessage');
    });

    it('should use crypto.subtle for HMAC SHA-256', () => {
      expect(code).toContain('crypto.subtle');
      expect(code).toContain('HMAC');
      expect(code).toContain('SHA-256');
    });

    it('should be valid JavaScript syntax', () => {
      expect(() => new Function(code)).not.toThrow();
    });
  });

  describe('verifyMessage', () => {
    let code;
    beforeAll(() => {
      code = verifyMessage();
    });

    it('should return a string', () => {
      expect(typeof code).toBe('string');
    });

    it('should contain async function declaration', () => {
      expect(code).toContain('async function verifyMessage');
    });

    it('should use crypto.subtle.verify', () => {
      expect(code).toContain('crypto.subtle');
    });

    it('should be valid JavaScript syntax', () => {
      expect(() => new Function(code)).not.toThrow();
    });
  });

  describe('verifySession', () => {
    let code;
    beforeAll(() => {
      code = verifySession();
    });

    it('should return a string', () => {
      expect(typeof code).toBe('string');
    });

    it('should contain async function declaration', () => {
      expect(code).toContain('async function verifySession');
    });

    it('should handle cookie parsing', () => {
      expect(code).toMatch(/[Cc]ookie/);
      expect(code).toContain('dashboard_session');
    });

    it('should reference SIGNING_SECRET', () => {
      expect(code).toContain('SIGNING_SECRET');
    });

    it('should be valid JavaScript syntax', () => {
      expect(() => new Function(code)).not.toThrow();
    });
  });

  describe('getCFZoneId', () => {
    let code;
    beforeAll(() => {
      code = getCFZoneId();
    });

    it('should return a string', () => {
      expect(typeof code).toBe('string');
    });

    it('should contain async function declaration', () => {
      expect(code).toContain('async function getCFZoneId');
    });

    it('should reference Cloudflare zones API', () => {
      expect(code).toContain('api.cloudflare.com/client/v4/zones');
    });

    it('should be valid JavaScript syntax', () => {
      expect(() => new Function(code)).not.toThrow();
    });
  });

  describe('getCFStats', () => {
    let code;
    beforeAll(() => {
      code = getCFStats();
    });

    it('should return a string', () => {
      expect(typeof code).toBe('string');
    });

    it('should contain async function declaration', () => {
      expect(code).toContain('async function getCFStats');
    });

    it('should reference Cloudflare GraphQL API', () => {
      expect(code).toContain('api.cloudflare.com/client/v4/graphql');
    });

    it('should query httpRequests data', () => {
      expect(code).toContain('httpRequests1dGroups');
    });

    it('should be valid JavaScript syntax', () => {
      expect(() => new Function(code)).not.toThrow();
    });
  });

  describe('generateAuthHelpers', () => {
    let code;
    beforeAll(() => {
      code = generateAuthHelpers();
    });

    it('should return a string', () => {
      expect(typeof code).toBe('string');
    });

    it('should contain all 6 function declarations', () => {
      expect(code).toContain('async function verifyGoogleToken');
      expect(code).toContain('async function signMessage');
      expect(code).toContain('async function verifyMessage');
      expect(code).toContain('async function verifySession');
      expect(code).toContain('async function getCFZoneId');
      expect(code).toContain('async function getCFStats');
    });

    it('should be a concatenation of all individual functions', () => {
      const individual = [
        verifyGoogleToken(),
        signMessage(),
        verifyMessage(),
        verifySession(),
        getCFZoneId(),
        getCFStats(),
      ];
      individual.forEach((fn) => {
        expect(code).toContain(fn.trim());
      });
    });

    it('should be valid JavaScript syntax as a whole', () => {
      expect(() => new Function(code)).not.toThrow();
    });
  });
});
