/**
 * Unit tests for typescript/portfolio-worker/lib/env.js
 */

const {
  validateEnv,
  getEnv,
} = require('../../../../typescript/portfolio-worker/lib/env');

describe('Environment Module', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
    // Suppress console output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    console.log.mockRestore();
    console.error.mockRestore();
  });

  describe('validateEnv', () => {
    test('should pass with NODE_ENV set', () => {
      process.env.NODE_ENV = 'test';
      expect(() => validateEnv()).not.toThrow();
    });

    test('should throw if NODE_ENV is missing', () => {
      delete process.env.NODE_ENV;
      expect(() => validateEnv()).toThrow(
        'Missing required environment variables: NODE_ENV',
      );
    });
  });

  describe('getEnv', () => {
    test('should return environment configuration', () => {
      process.env.NODE_ENV = 'production';
      process.env.DEBUG = '1';
      process.env.VERBOSE = 'true';

      const env = getEnv();

      expect(env.NODE_ENV).toBe('production');
      expect(env.DEBUG).toBe(true);
      expect(env.VERBOSE).toBe(true);
      expect(env.DEPLOYED_AT).toBeDefined();
    });

    test('should use defaults for missing optional variables', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.DEBUG;
      delete process.env.VERBOSE;
      delete process.env.DEPLOYED_AT;

      const env = getEnv();

      expect(env.NODE_ENV).toBe('test');
      expect(env.DEBUG).toBe(false);
      expect(env.VERBOSE).toBe(false);
      expect(env.DEPLOYED_AT).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    test('should handle DEBUG as string "1"', () => {
      process.env.NODE_ENV = 'test';
      process.env.DEBUG = '1';

      const env = getEnv();
      expect(env.DEBUG).toBe(true);
    });

    test('should handle DEBUG as string "true"', () => {
      process.env.NODE_ENV = 'test';
      process.env.DEBUG = 'true';

      const env = getEnv();
      expect(env.DEBUG).toBe(true);
    });

    test('should handle VERBOSE as string "1"', () => {
      process.env.NODE_ENV = 'test';
      process.env.VERBOSE = '1';

      const env = getEnv();
      expect(env.VERBOSE).toBe(true);
    });

    test('should default NODE_ENV to development', () => {
      delete process.env.NODE_ENV;

      const env = getEnv();
      expect(env.NODE_ENV).toBe('development');
    });
  });
});
