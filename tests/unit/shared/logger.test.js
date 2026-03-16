/**
 * Contract tests for Logger, RequestContext, LogLevel, generateRequestId.
 * Source: apps/job-server/src/shared/logger/index.js
 *
 * Wave 0 — lock public API surface before shared package extraction.
 *
 * Strategy: Pass env={} (no ELASTICSEARCH_URL) so all ES calls are silent no-ops.
 */

let Logger, RequestContext, LogLevel, generateRequestId;

beforeAll(async () => {
  const mod = await import('../../../apps/job-server/src/shared/logger/index.js');
  Logger = mod.Logger;
  RequestContext = mod.RequestContext;
  LogLevel = mod.LogLevel;
  generateRequestId = mod.generateRequestId;
});

describe('Logger Contract Tests', () => {
  // ─── Exports ───────────────────────────────────────────────────────────

  describe('Exports', () => {
    test('Logger class is exported', () => {
      expect(Logger).toBeDefined();
      expect(typeof Logger).toBe('function');
    });

    test('RequestContext class is exported', () => {
      expect(RequestContext).toBeDefined();
      expect(typeof RequestContext).toBe('function');
    });

    test('LogLevel object is exported', () => {
      expect(LogLevel).toBeDefined();
      expect(typeof LogLevel).toBe('object');
      expect(LogLevel.DEBUG).toBe('DEBUG');
      expect(LogLevel.INFO).toBe('INFO');
      expect(LogLevel.WARN).toBe('WARN');
      expect(LogLevel.ERROR).toBe('ERROR');
      expect(LogLevel.FATAL).toBe('FATAL');
    });

    test('generateRequestId function is exported', () => {
      expect(generateRequestId).toBeDefined();
      expect(typeof generateRequestId).toBe('function');
    });

    test('default export is Logger class', async () => {
      const mod = await import('../../../apps/job-server/src/shared/logger/index.js');
      expect(mod.default).toBe(Logger);
    });
  });

  // ─── RequestContext ────────────────────────────────────────────────────

  describe('RequestContext', () => {
    test('constructor with defaults', () => {
      const ctx = new RequestContext();
      expect(typeof ctx.requestId).toBe('string');
      expect(ctx.requestId.length).toBeGreaterThan(0);
      expect(typeof ctx.startTime).toBe('number');
      expect(ctx.method).toBe('');
      expect(ctx.path).toBe('');
      expect(ctx.userAgent).toBe('');
      expect(ctx.geo).toBeNull();
      expect(ctx.traceparent).toBe('');
      expect(ctx.tracestate).toBe('');
      expect(ctx.traceId).toBe('');
      expect(Object.isFrozen(ctx)).toBe(true);
    });

    test('constructor with options', () => {
      const ctx = new RequestContext({
        requestId: 'req-123',
        method: 'POST',
        path: '/api/test',
        userAgent: 'TestAgent/1.0',
        geo: { country: 'KR', city: 'Seoul', asn: 1234 },
        traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
        tracestate: 'vendor=value',
      });
      expect(ctx.requestId).toBe('req-123');
      expect(ctx.method).toBe('POST');
      expect(ctx.path).toBe('/api/test');
      expect(ctx.userAgent).toBe('TestAgent/1.0');
      expect(ctx.geo).toEqual({ country: 'KR', city: 'Seoul', asn: 1234 });
      expect(ctx.traceparent).toBe('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');
      expect(ctx.tracestate).toBe('vendor=value');
      expect(ctx.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
    });

    test('static fromRequest creates context from Request object', () => {
      const mockHeaders = new Map([
        ['user-agent', 'Mozilla/5.0'],
        ['traceparent', '00-abcdef1234567890abcdef1234567890-1234567890abcdef-01'],
        ['tracestate', 'vendor=abc'],
      ]);
      const mockRequest = {
        method: 'GET',
        url: 'https://example.com/api/health?foo=bar',
        headers: { get: (name) => mockHeaders.get(name) || '' },
        cf: { country: 'US', city: 'NYC', asn: 5678 },
      };
      const url = new URL(mockRequest.url);
      const ctx = RequestContext.fromRequest(mockRequest, url);

      expect(ctx.method).toBe('GET');
      expect(ctx.path).toBe('/api/health');
      expect(ctx.userAgent).toBe('Mozilla/5.0');
      expect(ctx.geo).toEqual({ country: 'US', city: 'NYC', asn: 5678 });
      expect(ctx.traceId).toBe('abcdef1234567890abcdef1234567890');
    });

    test('elapsed getter returns non-negative duration', async () => {
      const ctx = new RequestContext({ startTime: Date.now() - 50 });
      expect(ctx.elapsed).toBeGreaterThanOrEqual(45);
    });

    test('toLabels returns ECS-compatible labels', () => {
      const ctx = new RequestContext({
        requestId: 'req-lbl',
        method: 'GET',
        path: '/test',
        userAgent: 'UA/1.0',
        geo: { country: 'KR', city: 'Seoul', asn: 100 },
        traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      });
      const labels = ctx.toLabels();

      expect(labels.http.request.method).toBe('GET');
      expect(labels.http.request.id).toBe('req-lbl');
      expect(labels.url.path).toBe('/test');
      expect(labels.user_agent.original).toBe('UA/1.0');
      expect(labels.client.geo.country_iso_code).toBe('KR');
      expect(labels.client.geo.city_name).toBe('Seoul');
      expect(labels.client.as.number).toBe(100);
      expect(labels.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
      expect(labels.trace.id).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
      expect(labels.traceparent).toBeDefined();
    });

    test('toLabels excludes optional fields when absent', () => {
      const ctx = new RequestContext({ method: 'GET', path: '/' });
      const labels = ctx.toLabels();
      expect(labels.user_agent).toBeUndefined();
      expect(labels.client).toBeUndefined();
      expect(labels.traceId).toBeUndefined();
    });
  });

  // ─── Logger ────────────────────────────────────────────────────────────

  describe('Logger', () => {
    const env = {}; // No ELASTICSEARCH_URL → all ES calls are silent no-ops

    test('constructor stores env, service defaults to "default", minLevel defaults to "DEBUG"', () => {
      const logger = new Logger(env);
      expect(logger.env).toBe(env);
      expect(logger.service).toBe('default');
      expect(logger.minLevel).toBe('DEBUG');
      expect(logger.reqCtx).toBeNull();
      expect(logger.context).toEqual({});
    });

    test('Logger.create returns Logger instance', () => {
      const logger = Logger.create(env, { service: 'test-svc' });
      expect(logger).toBeInstanceOf(Logger);
      expect(logger.service).toBe('test-svc');
    });

    test('child() returns new Logger with merged context, inherits env/service/minLevel/reqCtx', () => {
      const reqCtx = new RequestContext({ method: 'GET', path: '/c' });
      const parent = new Logger(env, {
        service: 'parent-svc',
        minLevel: 'WARN',
        reqCtx,
        context: { component: 'auth' },
      });
      const child = parent.child({ handler: 'login' });

      expect(child).toBeInstanceOf(Logger);
      expect(child).not.toBe(parent);
      expect(child.env).toBe(env);
      expect(child.service).toBe('parent-svc');
      expect(child.minLevel).toBe('WARN');
      expect(child.reqCtx).toBe(reqCtx);
      expect(child.context).toEqual({ component: 'auth', handler: 'login' });
    });

    test('withRequest() returns new Logger with reqCtx bound', () => {
      const logger = new Logger(env, { service: 'svc' });
      const reqCtx = new RequestContext({ method: 'POST', path: '/api' });
      const bound = logger.withRequest(reqCtx);

      expect(bound).toBeInstanceOf(Logger);
      expect(bound).not.toBe(logger);
      expect(bound.reqCtx).toBe(reqCtx);
      expect(bound.service).toBe('svc');
    });

    test('debug/info/warn return Promises and do not throw', async () => {
      const logger = new Logger(env, { service: 'test' });
      const d = logger.debug('debug msg');
      const i = logger.info('info msg');
      const w = logger.warn('warn msg');

      expect(d).toBeInstanceOf(Promise);
      expect(i).toBeInstanceOf(Promise);
      expect(w).toBeInstanceOf(Promise);

      await expect(d).resolves.not.toThrow();
      await expect(i).resolves.not.toThrow();
      await expect(w).resolves.not.toThrow();
    });

    test('error() returns Promise, does not throw, calls console.error', async () => {
      const logger = new Logger(env, { service: 'err-test' });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const err = new Error('test error');
      const p = logger.error('Handler failed', err);
      expect(p).toBeInstanceOf(Promise);
      await p;

      expect(consoleSpy).toHaveBeenCalled();
      const callArg = consoleSpy.mock.calls[0][0];
      expect(callArg).toContain('[err-test]');
      expect(callArg).toContain('Handler failed');

      consoleSpy.mockRestore();
    });

    test('fatal() returns Promise, does not throw, calls console.error with FATAL prefix', async () => {
      const logger = new Logger(env, { service: 'fatal-test' });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const p = logger.fatal('System crash', new Error('boom'));
      expect(p).toBeInstanceOf(Promise);
      await p;

      expect(consoleSpy).toHaveBeenCalled();
      const callArg = consoleSpy.mock.calls[0][0];
      expect(callArg).toContain('[FATAL]');
      expect(callArg).toContain('[fatal-test]');

      consoleSpy.mockRestore();
    });

    test('logRequest returns a Promise', async () => {
      const reqCtx = new RequestContext({ method: 'GET', path: '/test' });
      const logger = new Logger(env, { service: 'req-test', reqCtx });
      const mockReq = { method: 'GET' };
      const mockUrl = { pathname: '/test' };

      const p = logger.logRequest(mockReq, mockUrl);
      expect(p).toBeInstanceOf(Promise);
      await p;
    });

    test('logResponse returns a Promise', async () => {
      const reqCtx = new RequestContext({ method: 'GET', path: '/resp' });
      const logger = new Logger(env, { service: 'resp-test', reqCtx });
      const mockResponse = { status: 200 };

      const p = logger.logResponse(mockResponse);
      expect(p).toBeInstanceOf(Promise);
      await p;
    });

    test('flush() returns a Promise', async () => {
      const logger = new Logger(env, { service: 'flush-test' });
      const p = logger.flush();
      expect(p).toBeInstanceOf(Promise);
      await p;
    });

    test('level filtering: logger with minLevel=WARN filters out DEBUG/INFO via _shouldLog', () => {
      const logger = new Logger(env, { minLevel: 'WARN' });

      expect(logger._shouldLog('DEBUG')).toBe(false);
      expect(logger._shouldLog('INFO')).toBe(false);
      expect(logger._shouldLog('WARN')).toBe(true);
      expect(logger._shouldLog('ERROR')).toBe(true);
      expect(logger._shouldLog('FATAL')).toBe(true);
    });

    test('error() bypasses _shouldLog — always logs regardless of minLevel', async () => {
      const logger = new Logger(env, { minLevel: 'FATAL', service: 'bypass' });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await logger.error('Critical issue', new Error('fail'));

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
