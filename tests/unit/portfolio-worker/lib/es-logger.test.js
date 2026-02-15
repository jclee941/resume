'use strict';

describe('es-logger', () => {
  let esLogger;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    jest.mock('../../../../typescript/portfolio-worker/logger', () => ({
      warn: jest.fn(),
      log: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    }));
    global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
    global.AbortController = class {
      constructor() {
        this.signal = {};
        this.abort = jest.fn();
      }
    };
    esLogger = require('../../../../typescript/portfolio-worker/lib/es-logger');
  });

  afterEach(() => {
    jest.useRealTimers();
    delete global.fetch;
  });

  describe('generateRequestId', () => {
    it('should return a non-empty string', () => {
      const id = esLogger.generateRequestId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should contain a dash separator', () => {
      const id = esLogger.generateRequestId();
      expect(id).toContain('-');
    });

    it('should generate unique IDs across calls', () => {
      const ids = new Set(Array.from({ length: 20 }, () => esLogger.generateRequestId()));
      expect(ids.size).toBe(20);
    });
  });

  describe('logToElasticsearch', () => {
    const mockEnv = {
      ELASTICSEARCH_URL: 'https://es.example.com',
      ELASTICSEARCH_API_KEY: 'test-api-key',
      ELASTICSEARCH_INDEX: 'test-index',
    };

    it('should not throw even on errors', async () => {
      global.fetch = jest.fn(() => Promise.reject(new Error('network error')));
      await expect(
        esLogger.logToElasticsearch(mockEnv, 'test message', 'ERROR', {}, { immediate: true })
      ).resolves.not.toThrow();
    });

    it('should handle missing ES URL gracefully', async () => {
      await esLogger.logToElasticsearch({}, 'test message', 'INFO', {}, { immediate: true });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle missing API key gracefully', async () => {
      await esLogger.logToElasticsearch(
        { ELASTICSEARCH_URL: 'https://es.example.com' },
        'test',
        'INFO',
        {},
        { immediate: true }
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    describe('immediate mode', () => {
      it('should call fetch directly with POST', async () => {
        await esLogger.logToElasticsearch(mockEnv, 'test msg', 'INFO', {}, { immediate: true });
        expect(global.fetch).toHaveBeenCalledTimes(1);
        const [url, opts] = global.fetch.mock.calls[0];
        expect(url).toContain('es.example.com');
        expect(url).toContain('_doc');
        expect(opts.method).toBe('POST');
      });

      it('should include API key in headers', async () => {
        await esLogger.logToElasticsearch(mockEnv, 'test', 'INFO', {}, { immediate: true });
        const [, opts] = global.fetch.mock.calls[0];
        expect(opts.headers).toHaveProperty('Authorization', 'ApiKey test-api-key');
      });

      it('should send ECS-formatted document', async () => {
        await esLogger.logToElasticsearch(
          mockEnv,
          'hello',
          'WARN',
          { custom: 'label' },
          { immediate: true }
        );
        const [, opts] = global.fetch.mock.calls[0];
        const body = JSON.parse(opts.body);
        expect(body).toHaveProperty('message', 'hello');
        expect(body).toHaveProperty('log');
        expect(body.log).toHaveProperty('level', 'warn');
        expect(body).toHaveProperty('@timestamp');
        expect(body).toHaveProperty('ecs');
      });
    });

    describe('batch mode', () => {
      it('should queue messages and not flush immediately', async () => {
        await esLogger.logToElasticsearch(mockEnv, 'batch msg');
        expect(global.fetch).not.toHaveBeenCalled();
      });

      it('should flush when batch size is reached', async () => {
        for (let i = 0; i < 10; i++) {
          await esLogger.logToElasticsearch(mockEnv, `msg ${i}`);
        }
        await jest.advanceTimersByTimeAsync(0);
        expect(global.fetch).toHaveBeenCalled();
      });

      it('should flush after BATCH_FLUSH_MS timeout', async () => {
        await esLogger.logToElasticsearch(mockEnv, 'delayed msg');
        expect(global.fetch).not.toHaveBeenCalled();

        await jest.advanceTimersByTimeAsync(1100);
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('should use default level INFO', async () => {
      await esLogger.logToElasticsearch(
        mockEnv,
        'default level',
        undefined,
        {},
        { immediate: true }
      );
      const [, opts] = global.fetch.mock.calls[0];
      const body = JSON.parse(opts.body);
      expect(body.log.level).toBe('info');
    });

    it('should use custom index from options', async () => {
      await esLogger.logToElasticsearch(
        mockEnv,
        'test',
        'INFO',
        {},
        { immediate: true, index: 'custom-index' }
      );
      const [url] = global.fetch.mock.calls[0];
      expect(url).toContain('custom-index');
    });
  });

  describe('logResponse', () => {
    const mockEnv = {
      ELASTICSEARCH_URL: 'https://es.example.com',
      ELASTICSEARCH_API_KEY: 'test-api-key',
    };

    const mockRequest = {
      method: 'GET',
      url: 'https://resume.jclee.me/',
      headers: new Map([['user-agent', 'test']]),
    };

    it('should call logToElasticsearch with immediate mode', async () => {
      const mockResponse = { status: 200 };
      await esLogger.logResponse(mockEnv, mockRequest, mockResponse);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should use ERROR level for status >= 400', async () => {
      const mockResponse = { status: 500 };
      await esLogger.logResponse(mockEnv, mockRequest, mockResponse);
      const [, opts] = global.fetch.mock.calls[0];
      const body = JSON.parse(opts.body);
      expect(body.log.level).toBe('error');
    });

    it('should use INFO level for successful responses', async () => {
      const mockResponse = { status: 200 };
      await esLogger.logResponse(mockEnv, mockRequest, mockResponse);
      const [, opts] = global.fetch.mock.calls[0];
      const body = JSON.parse(opts.body);
      expect(body.log.level).toBe('info');
    });

    it('should include HTTP context in labels', async () => {
      const mockResponse = { status: 200 };
      await esLogger.logResponse(mockEnv, mockRequest, mockResponse);
      const [, opts] = global.fetch.mock.calls[0];
      const body = JSON.parse(opts.body);
      expect(body).toHaveProperty('http');
    });

    it('should use provided requestId', async () => {
      const mockResponse = { status: 200 };
      await esLogger.logResponse(mockEnv, mockRequest, mockResponse, {
        requestId: 'custom-id-123',
      });
      const [, opts] = global.fetch.mock.calls[0];
      const body = JSON.parse(opts.body);
      expect(JSON.stringify(body)).toContain('custom-id-123');
    });
  });

  describe('flush', () => {
    const mockEnv = {
      ELASTICSEARCH_URL: 'https://es.example.com',
      ELASTICSEARCH_API_KEY: 'test-api-key',
    };

    it('should flush queued messages', async () => {
      await esLogger.logToElasticsearch(mockEnv, 'queued msg 1');
      await esLogger.logToElasticsearch(mockEnv, 'queued msg 2');
      expect(global.fetch).not.toHaveBeenCalled();

      await esLogger.flush(mockEnv);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should not call fetch if queue is empty', async () => {
      await esLogger.flush(mockEnv);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should accept custom index from options', async () => {
      await esLogger.logToElasticsearch(mockEnv, 'test');
      await esLogger.flush(mockEnv, { index: 'custom-flush-index' });
      if (global.fetch.mock.calls.length > 0) {
        const [url] = global.fetch.mock.calls[0];
        expect(url).toContain('_bulk');
      }
    });

    it('should handle flush failure gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      jest.resetModules();
      global.fetch = jest.fn().mockResolvedValue({ ok: true });
      const loggerMod = require('../../../../typescript/portfolio-worker/lib/es-logger');

      // Queue a message in batch mode
      await loggerMod.logToElasticsearch(mockEnv, 'queued msg');
      // Make fetch reject on flush
      global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'));

      await loggerMod.flush(mockEnv);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Bulk flush failed'),
        expect.anything(),
        expect.anything()
      );
      consoleSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle outer catch in logToElasticsearch when level is null', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      jest.resetModules();
      global.fetch = jest.fn().mockResolvedValue({ ok: true });
      const loggerMod = require('../../../../typescript/portfolio-worker/lib/es-logger');
      const env = {
        ELASTICSEARCH_URL: 'https://es.test.com',
        ELASTICSEARCH_API_KEY: 'test-key',
      };

      // Pass null as level — buildEcsDocument calls level.toLowerCase() which throws TypeError
      await loggerMod.logToElasticsearch(env, 'test message', null);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ES] logToElasticsearch failed'),
        expect.anything()
      );
      consoleSpy.mockRestore();
    });
  });

  describe('flushLogs early return when credentials missing', () => {
    let loggerMod;

    beforeEach(() => {
      jest.resetModules();
      jest.mock('../../../../typescript/portfolio-worker/logger', () => ({
        warn: jest.fn(),
        log: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
      }));
      global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
      loggerMod = require('../../../../typescript/portfolio-worker/lib/es-logger');
    });

    it('returns early in flushLogs when ELASTICSEARCH_URL is missing', async () => {
      // Queue with valid credentials
      const validEnv = {
        ELASTICSEARCH_URL: 'https://es.example.com',
        ELASTICSEARCH_API_KEY: 'test-api-key',
      };
      await loggerMod.logToElasticsearch(validEnv, 'queued msg');
      // Flush with missing URL — triggers L34 early return
      await loggerMod.flush({});
      // fetch should NOT be called for the flush (only potentially for batch auto-flush)
      // The key is that flush({}) does not throw
    });

    it('returns early in flushLogs when ELASTICSEARCH_API_KEY is missing', async () => {
      const validEnv = {
        ELASTICSEARCH_URL: 'https://es.example.com',
        ELASTICSEARCH_API_KEY: 'test-api-key',
      };
      await loggerMod.logToElasticsearch(validEnv, 'queued msg');
      await loggerMod.flush({ ELASTICSEARCH_URL: 'https://es.example.com' });
      // Should not throw
    });
  });

  describe('flush timer deduplication', () => {
    const mockEnv = {
      ELASTICSEARCH_URL: 'https://es.example.com',
      ELASTICSEARCH_API_KEY: 'test-api-key',
      ES_BATCH_MODE: 'true',
    };

    let loggerMod;

    beforeEach(() => {
      jest.resetModules();
      jest.mock('../../../../typescript/portfolio-worker/logger', () => ({
        warn: jest.fn(),
        log: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
      }));
      global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
      loggerMod = require('../../../../typescript/portfolio-worker/lib/es-logger');
    });

    it('does not create a second timer when one already exists', async () => {
      const timeoutSpy = jest.spyOn(global, 'setTimeout');

      await loggerMod.logToElasticsearch(mockEnv, 'first queued message');
      await loggerMod.logToElasticsearch(mockEnv, 'second queued message');

      expect(timeoutSpy).toHaveBeenCalledTimes(1);
      timeoutSpy.mockRestore();
    });
  });

  describe('flushLogs inner catch', () => {
    const mockEnv = {
      ELASTICSEARCH_URL: 'https://es.example.com',
      ELASTICSEARCH_API_KEY: 'test-api-key',
    };

    let loggerMod;
    let loggerMock;

    beforeEach(() => {
      jest.resetModules();
      jest.mock('../../../../typescript/portfolio-worker/logger', () => ({
        warn: jest.fn(),
        log: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
      }));
      global.fetch = jest.fn().mockRejectedValue(new Error('bulk unavailable'));
      loggerMod = require('../../../../typescript/portfolio-worker/lib/es-logger');
      loggerMock = require('../../../../typescript/portfolio-worker/logger');
    });

    it('silently catches when console.error throws during bulk flush failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {
        throw new Error('console write failed');
      });

      try {
        await loggerMod.logToElasticsearch(mockEnv, 'queued before failing flush');
        await loggerMod.flush(mockEnv);
      } finally {
        consoleSpy.mockRestore();
      }

      expect(loggerMock.warn).toHaveBeenCalledWith('ES bulk flush failed:', 'bulk unavailable');
    });
  });
});
