'use strict';

describe('es-logger', () => {
  let esLogger;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
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
      CF_ACCESS_CLIENT_ID: 'cf-id',
      CF_ACCESS_CLIENT_SECRET: 'cf-secret',
      ELASTICSEARCH_API_KEY: 'test-api-key',
      ELASTICSEARCH_INDEX: 'test-index',
    };

    it('should not throw even on fetch errors', async () => {
      global.fetch = jest.fn(() => Promise.reject(new Error('network error')));
      await expect(
        esLogger.logToElasticsearch(mockEnv, 'test message', 'ERROR')
      ).resolves.not.toThrow();
    });

    it('should handle missing ES URL gracefully', async () => {
      await esLogger.logToElasticsearch({ CF_ACCESS_CLIENT_ID: 'id' }, 'test message', 'INFO');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle missing auth credentials gracefully', async () => {
      await esLogger.logToElasticsearch(
        { ELASTICSEARCH_URL: 'https://es.example.com' },
        'test',
        'INFO'
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should allow API key-only auth when CF Access credentials are missing', async () => {
      await esLogger.logToElasticsearch(
        {
          ELASTICSEARCH_URL: 'https://es.example.com',
          ELASTICSEARCH_API_KEY: 'api-key-only',
        },
        'test',
        'INFO'
      );
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should allow sending when API key exists even if CF Access is partially configured', async () => {
      await esLogger.logToElasticsearch(
        {
          ELASTICSEARCH_URL: 'https://es.example.com',
          ELASTICSEARCH_API_KEY: 'api-key',
          CF_ACCESS_CLIENT_ID: 'cf-id-only',
        },
        'test',
        'INFO'
      );
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should skip sending when CF Access credentials exist but API key is missing', async () => {
      await esLogger.logToElasticsearch(
        {
          ELASTICSEARCH_URL: 'https://es.example.com',
          CF_ACCESS_CLIENT_ID: 'cf-id',
          CF_ACCESS_CLIENT_SECRET: 'cf-secret',
        },
        'test',
        'INFO'
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should call fetch with POST to _doc endpoint', async () => {
      await esLogger.logToElasticsearch(mockEnv, 'test msg', 'INFO');
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, opts] = global.fetch.mock.calls[0];
      expect(url).toBe('https://es.example.com/test-index/_doc');
      expect(opts.method).toBe('POST');
    });

    it('should include CF-Access headers when credentials are present', async () => {
      await esLogger.logToElasticsearch(mockEnv, 'test', 'INFO');
      const [, opts] = global.fetch.mock.calls[0];
      expect(opts.headers).toHaveProperty('CF-Access-Client-Id', 'cf-id');
      expect(opts.headers).toHaveProperty('CF-Access-Client-Secret', 'cf-secret');
    });

    it('should include API key in Authorization header', async () => {
      await esLogger.logToElasticsearch(mockEnv, 'test', 'INFO');
      const [, opts] = global.fetch.mock.calls[0];
      expect(opts.headers).toHaveProperty('Authorization', 'ApiKey test-api-key');
    });

    it('should send flat-schema document with correct fields', async () => {
      await esLogger.logToElasticsearch(mockEnv, 'hello', 'WARN', { custom: 'label' });
      const [, opts] = global.fetch.mock.calls[0];
      const body = JSON.parse(opts.body);
      expect(body).toHaveProperty('message', 'hello');
      expect(body).toHaveProperty('level', 'warn');
      expect(body).toHaveProperty('log.level', 'warn');
      expect(body).toHaveProperty('service.name', 'resume-worker');
      expect(body).toHaveProperty('serviceName', 'resume-worker');
      expect(body).toHaveProperty('ecs.version', '8.11');
      expect(body).toHaveProperty('@timestamp');
      expect(body).toHaveProperty('custom', 'label');
    });

    it('should derive trace fields from traceparent header', async () => {
      const request = {
        headers: new Headers({
          traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
          tracestate: 'vendorA=abc',
        }),
      };

      await esLogger.logToElasticsearch(mockEnv, 'trace test', 'INFO', {}, { request });

      const [, opts] = global.fetch.mock.calls[0];
      const body = JSON.parse(opts.body);
      expect(body).toHaveProperty('traceId', '4bf92f3577b34da6a3ce929d0e0e4736');
      expect(body).toHaveProperty('correlationId', '4bf92f3577b34da6a3ce929d0e0e4736');
      expect(body).toHaveProperty('traceparent');
      expect(body).toHaveProperty('tracestate', 'vendorA=abc');
      expect(body).toHaveProperty('trace');
      expect(body.trace).toHaveProperty('id', '4bf92f3577b34da6a3ce929d0e0e4736');
    });

    it('should use default level INFO when level is undefined', async () => {
      await esLogger.logToElasticsearch(mockEnv, 'default level');
      const [, opts] = global.fetch.mock.calls[0];
      const body = JSON.parse(opts.body);
      expect(body.level).toBe('info');
    });

    it('should use custom index from options', async () => {
      await esLogger.logToElasticsearch(mockEnv, 'test', 'INFO', {}, { index: 'custom-index' });
      const [url] = global.fetch.mock.calls[0];
      expect(url).toContain('custom-index');
    });

    it('should use env ELASTICSEARCH_INDEX when no options.index', async () => {
      await esLogger.logToElasticsearch(mockEnv, 'test', 'INFO');
      const [url] = global.fetch.mock.calls[0];
      expect(url).toContain('test-index');
    });

    it('should fallback to default index when env has no ELASTICSEARCH_INDEX', async () => {
      const envNoIndex = {
        ELASTICSEARCH_URL: 'https://es.example.com',
        ELASTICSEARCH_API_KEY: 'test-api-key',
      };
      await esLogger.logToElasticsearch(envNoIndex, 'test', 'INFO');
      const [url] = global.fetch.mock.calls[0];
      expect(url).toContain('resume-logs-worker');
    });

    it('should include abort signal in fetch options', async () => {
      await esLogger.logToElasticsearch(mockEnv, 'test', 'INFO');
      const [, opts] = global.fetch.mock.calls[0];
      expect(opts).toHaveProperty('signal');
    });

    it('should use custom timeout from options', async () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      await esLogger.logToElasticsearch(mockEnv, 'test', 'INFO', {}, { timeout: 3000 });
      const timeoutCalls = setTimeoutSpy.mock.calls.filter(([, ms]) => ms === 3000);
      expect(timeoutCalls.length).toBe(1);
      setTimeoutSpy.mockRestore();
    });

    it('should use default timeout of 5000ms when not specified', async () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      await esLogger.logToElasticsearch(mockEnv, 'test', 'INFO');
      const timeoutCalls = setTimeoutSpy.mock.calls.filter(([, ms]) => ms === 5000);
      expect(timeoutCalls.length).toBe(1);
      setTimeoutSpy.mockRestore();
    });

    it('should clear timeout after fetch completes', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      await esLogger.logToElasticsearch(mockEnv, 'test', 'INFO');
      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should clear timeout even when fetch rejects', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      global.fetch = jest.fn(() => Promise.reject(new Error('fail')));
      await esLogger.logToElasticsearch(mockEnv, 'test', 'INFO');
      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should log error to console when fetch fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      global.fetch = jest.fn(() => Promise.reject(new Error('network down')));
      await esLogger.logToElasticsearch(mockEnv, 'test', 'INFO');
      expect(consoleSpy).toHaveBeenCalledWith('[ES] Log failed:', 'network down');
      consoleSpy.mockRestore();
    });

    it('should handle null env gracefully', async () => {
      await expect(esLogger.logToElasticsearch(null, 'test', 'INFO')).resolves.not.toThrow();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle undefined env gracefully', async () => {
      await expect(esLogger.logToElasticsearch(undefined, 'test', 'INFO')).resolves.not.toThrow();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('buildEsHeaders coverage', () => {
    const baseEnv = {
      ELASTICSEARCH_URL: 'https://es.example.com',
      CF_ACCESS_CLIENT_ID: 'cf-id',
    };

    const baseEnvWithApiKey = {
      ELASTICSEARCH_URL: 'https://es.example.com',
      CF_ACCESS_CLIENT_ID: 'cf-id',
      ELASTICSEARCH_API_KEY: 'test-api-key',
    };

    it('should omit CF-Access-Client-Secret when not provided', async () => {
      await esLogger.logToElasticsearch(baseEnvWithApiKey, 'test', 'INFO');
      const [, opts] = global.fetch.mock.calls[0];
      expect(opts.headers).not.toHaveProperty('CF-Access-Client-Secret');
    });

    it('should skip send when ELASTICSEARCH_API_KEY is not provided', async () => {
      await esLogger.logToElasticsearch(baseEnv, 'test', 'INFO');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should always include Content-Type application/json', async () => {
      await esLogger.logToElasticsearch(baseEnvWithApiKey, 'test', 'INFO');
      const [, opts] = global.fetch.mock.calls[0];
      expect(opts.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('logResponse', () => {
    const mockEnv = {
      ELASTICSEARCH_URL: 'https://es.example.com',
      CF_ACCESS_CLIENT_ID: 'cf-id',
      ELASTICSEARCH_API_KEY: 'test-api-key',
    };

    const mockRequest = {
      method: 'GET',
      url: 'https://resume.jclee.me/about',
    };

    it('should call fetch for successful responses', async () => {
      const mockResponse = { status: 200 };
      await esLogger.logResponse(mockEnv, mockRequest, mockResponse);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should use ERROR level for status >= 400', async () => {
      const mockResponse = { status: 500 };
      await esLogger.logResponse(mockEnv, mockRequest, mockResponse);
      const [, opts] = global.fetch.mock.calls[0];
      const body = JSON.parse(opts.body);
      expect(body.level).toBe('error');
    });

    it('should use INFO level for successful responses', async () => {
      const mockResponse = { status: 200 };
      await esLogger.logResponse(mockEnv, mockRequest, mockResponse);
      const [, opts] = global.fetch.mock.calls[0];
      const body = JSON.parse(opts.body);
      expect(body.level).toBe('info');
    });

    it('should include correlationId in labels', async () => {
      const mockResponse = { status: 200 };
      await esLogger.logResponse(mockEnv, mockRequest, mockResponse);
      const [, opts] = global.fetch.mock.calls[0];
      const body = JSON.parse(opts.body);
      expect(body).toHaveProperty('correlationId');
    });

    it('should include route from URL', async () => {
      const mockResponse = { status: 200 };
      await esLogger.logResponse(mockEnv, mockRequest, mockResponse);
      const [, opts] = global.fetch.mock.calls[0];
      const body = JSON.parse(opts.body);
      expect(body).toHaveProperty('route', '/about');
    });

    it('should include statusCode and duration', async () => {
      const mockResponse = { status: 404 };
      await esLogger.logResponse(mockEnv, mockRequest, mockResponse);
      const [, opts] = global.fetch.mock.calls[0];
      const body = JSON.parse(opts.body);
      expect(body).toHaveProperty('statusCode', 404);
      expect(body).toHaveProperty('duration');
      expect(typeof body.duration).toBe('number');
    });

    it('should use provided requestId', async () => {
      const mockResponse = { status: 200 };
      await esLogger.logResponse(mockEnv, mockRequest, mockResponse, {
        requestId: 'custom-id-123',
      });
      const [, opts] = global.fetch.mock.calls[0];
      const body = JSON.parse(opts.body);
      expect(body.correlationId).toBe('custom-id-123');
    });

    it('should generate requestId when not provided', async () => {
      const mockResponse = { status: 200 };
      await esLogger.logResponse(mockEnv, mockRequest, mockResponse);
      const [, opts] = global.fetch.mock.calls[0];
      const body = JSON.parse(opts.body);
      expect(body.correlationId).toBeTruthy();
      expect(body.correlationId).toContain('-');
    });

    it('should use provided startTime for duration calculation', async () => {
      const mockResponse = { status: 200 };
      const startTime = Date.now() - 150;
      await esLogger.logResponse(mockEnv, mockRequest, mockResponse, { startTime });
      const [, opts] = global.fetch.mock.calls[0];
      const body = JSON.parse(opts.body);
      expect(body.duration).toBeGreaterThanOrEqual(150);
    });

    it('should format message as "METHOD STATUS DURATIONms"', async () => {
      const mockResponse = { status: 200 };
      await esLogger.logResponse(mockEnv, mockRequest, mockResponse);
      const [, opts] = global.fetch.mock.calls[0];
      const body = JSON.parse(opts.body);
      expect(body.message).toMatch(/^GET 200 \d+ms$/);
    });
  });

  describe('abort timeout', () => {
    const mockEnv = {
      ELASTICSEARCH_URL: 'https://es.example.com',
      CF_ACCESS_CLIENT_ID: 'cf-id',
      ELASTICSEARCH_API_KEY: 'test-api-key',
    };

    it('should set up abort timeout callback', () => {
      let timeoutCallback;
      const origSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((cb, ms) => {
        timeoutCallback = cb;
        return origSetTimeout(cb, ms);
      });

      let abortFn;
      global.AbortController = class {
        constructor() {
          this.signal = {};
          this.abort = jest.fn();
          abortFn = this.abort;
        }
      };
      global.fetch = jest.fn(() => Promise.resolve({ ok: true }));

      esLogger.logToElasticsearch(mockEnv, 'test', 'INFO', {}, { timeout: 100 });

      const abortCallback = global.setTimeout.mock.calls.find(([, ms]) => ms === 100);
      expect(abortCallback).toBeDefined();
      abortCallback[0]();
      expect(abortFn).toHaveBeenCalled();

      global.setTimeout = origSetTimeout;
    });
  });

  describe('edge cases', () => {
    const mockEnv = {
      ELASTICSEARCH_URL: 'https://es.test.com',
      CF_ACCESS_CLIENT_ID: 'cf-id',
      ELASTICSEARCH_API_KEY: 'test-key',
    };

    it('should handle outer catch when level is null', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      await esLogger.logToElasticsearch(mockEnv, 'test message', null);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[ES]'), expect.anything());
      consoleSpy.mockRestore();
    });

    it('should propagate if console.error throws in outer catch', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {
        throw new Error('console broken');
      });
      await expect(esLogger.logToElasticsearch(mockEnv, 'test', null)).rejects.toThrow(
        'console broken'
      );
      consoleSpy.mockRestore();
    });
  });
});
