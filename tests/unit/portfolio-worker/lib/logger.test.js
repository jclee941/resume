/**
 * Logger module tests
 */

describe('Logger Module', () => {
  let logger;
  let originalEnv;
  let consoleSpy;

  beforeEach(() => {
    // Store original env
    originalEnv = { ...process.env };

    // Clear module cache to re-import with new env
    jest.resetModules();

    // Spy on console methods
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      debug: jest.spyOn(console, 'debug').mockImplementation(),
    };
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;

    // Restore console methods
    Object.values(consoleSpy).forEach((spy) => spy.mockRestore());
  });

  describe('in test environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test';
      logger = require('../../../../typescript/portfolio-worker/logger');
    });

    test('log should be suppressed', () => {
      logger.log('test message');
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    test('error should always be shown', () => {
      logger.error('error message');
      expect(consoleSpy.error).toHaveBeenCalledWith('error message');
    });

    test('warn should be suppressed', () => {
      logger.warn('warning message');
      expect(consoleSpy.warn).not.toHaveBeenCalled();
    });

    test('debug should be suppressed', () => {
      process.env.DEBUG = 'true';
      logger.debug('debug message');
      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });
  });

  describe('in production environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      logger = require('../../../../typescript/portfolio-worker/logger');
    });

    test('log should output messages', () => {
      logger.log('test message');
      expect(consoleSpy.log).toHaveBeenCalledWith('test message');
    });

    test('log should handle multiple arguments', () => {
      logger.log('message', 123, { key: 'value' });
      expect(consoleSpy.log).toHaveBeenCalledWith('message', 123, {
        key: 'value',
      });
    });

    test('error should output messages', () => {
      logger.error('error message');
      expect(consoleSpy.error).toHaveBeenCalledWith('error message');
    });

    test('error should handle multiple arguments', () => {
      logger.error('error', new Error('test'));
      expect(consoleSpy.error).toHaveBeenCalledWith('error', expect.any(Error));
    });

    test('warn should output messages', () => {
      logger.warn('warning message');
      expect(consoleSpy.warn).toHaveBeenCalledWith('warning message');
    });

    test('warn should handle multiple arguments', () => {
      logger.warn('warning', 'additional info');
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        'warning',
        'additional info',
      );
    });

    test('debug should be suppressed without DEBUG env', () => {
      delete process.env.DEBUG;
      logger.debug('debug message');
      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });

    test('debug should output with DEBUG env set', () => {
      process.env.DEBUG = 'true';
      // Re-import to pick up new env
      jest.resetModules();
      const debugLogger = require('../../../../typescript/portfolio-worker/logger');
      debugLogger.debug('debug message');
      expect(consoleSpy.debug).toHaveBeenCalledWith('debug message');
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      logger = require('../../../../typescript/portfolio-worker/logger');
    });

    test('should handle empty arguments', () => {
      logger.log();
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    test('should handle undefined and null', () => {
      logger.log(undefined, null);
      expect(consoleSpy.log).toHaveBeenCalledWith(undefined, null);
    });

    test('should handle objects and arrays', () => {
      const obj = { key: 'value' };
      const arr = [1, 2, 3];
      logger.log(obj, arr);
      expect(consoleSpy.log).toHaveBeenCalledWith(obj, arr);
    });
  });

  describe('verbose mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.VERBOSE = 'true';
      jest.resetModules();
      logger = require('../../../../typescript/portfolio-worker/logger');
    });

    test('verbose should output with VERBOSE env set', () => {
      logger.verbose('verbose message');
      expect(consoleSpy.log).toHaveBeenCalled();
      const call = consoleSpy.log.mock.calls[0];
      expect(call[0]).toMatch(/\[.*\] \[VERBOSE\]/);
      expect(call[1]).toBe('verbose message');
    });

    test('log should include timestamp when VERBOSE is set', () => {
      logger.log('test message');
      expect(consoleSpy.log).toHaveBeenCalled();
      const call = consoleSpy.log.mock.calls[0];
      expect(call[0]).toMatch(/\[.*\] \[INFO\]/);
    });

    test('verbose should be suppressed in test environment', () => {
      process.env.NODE_ENV = 'test';
      jest.resetModules();
      const testLogger = require('../../../../typescript/portfolio-worker/logger');
      testLogger.verbose('verbose message');
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });

  describe('trace mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.DEBUG = 'true';
      process.env.VERBOSE = 'true';
      jest.resetModules();
      consoleSpy.trace = jest.spyOn(console, 'trace').mockImplementation();
      logger = require('../../../../typescript/portfolio-worker/logger');
    });

    afterEach(() => {
      consoleSpy.trace.mockRestore();
    });

    test('trace should output with DEBUG and VERBOSE env set', () => {
      logger.trace('trace message');
      expect(consoleSpy.trace).toHaveBeenCalled();
      const call = consoleSpy.trace.mock.calls[0];
      expect(call[0]).toMatch(/\[.*\] \[TRACE\]/);
      expect(call[1]).toBe('trace message');
    });

    test('trace should be suppressed without DEBUG', () => {
      delete process.env.DEBUG;
      jest.resetModules();
      const noDebugLogger = require('../../../../typescript/portfolio-worker/logger');
      noDebugLogger.trace('trace message');
      expect(consoleSpy.trace).not.toHaveBeenCalled();
    });

    test('trace should be suppressed without VERBOSE', () => {
      delete process.env.VERBOSE;
      jest.resetModules();
      const noVerboseLogger = require('../../../../typescript/portfolio-worker/logger');
      noVerboseLogger.trace('trace message');
      expect(consoleSpy.trace).not.toHaveBeenCalled();
    });

    test('trace should be suppressed in test environment', () => {
      process.env.NODE_ENV = 'test';
      jest.resetModules();
      const testLogger = require('../../../../typescript/portfolio-worker/logger');
      testLogger.trace('trace message');
      expect(consoleSpy.trace).not.toHaveBeenCalled();
    });
  });
});
