const fs = require('fs');
const path = require('path');

const {
  generateTraceId,
  generateSpanId,
  parseTraceparent,
  createTraceparent,
  propagateTraceContext,
  startRouteSpan,
  finishRouteSpan,
  withRouteSpan,
} = require('../../../../typescript/portfolio-worker/lib/tracing');

function loadInternalResolveContextFromHeaders() {
  const tracingPath = path.resolve(
    __dirname,
    '../../../../typescript/portfolio-worker/lib/tracing.js'
  );
  const source = fs.readFileSync(tracingPath, 'utf8');
  const module = { exports: {} };
  const factory = new Function(
    'require',
    'module',
    'exports',
    'Headers',
    'crypto',
    `${source}\nmodule.exports.__resolveContextFromHeaders = resolveContextFromHeaders;`
  );

  factory(require, module, module.exports, Headers, globalThis.crypto);
  return module.exports.__resolveContextFromHeaders;
}

describe('tracing', () => {
  let resolveContextFromHeaders;
  let consoleErrorSpy;

  beforeEach(() => {
    resolveContextFromHeaders = loadInternalResolveContextFromHeaders();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    if (consoleErrorSpy) {
      consoleErrorSpy.mockRestore();
    }
  });

  describe('generateTraceId', () => {
    it('returns a 32-character hex string and is unique across calls', () => {
      const first = generateTraceId();
      const second = generateTraceId();

      expect(first).toMatch(/^[a-f0-9]{32}$/);
      expect(second).toMatch(/^[a-f0-9]{32}$/);
      expect(first).not.toBe(second);
    });
  });

  describe('generateSpanId', () => {
    it('returns a 16-character hex string and is unique across calls', () => {
      const first = generateSpanId();
      const second = generateSpanId();

      expect(first).toMatch(/^[a-f0-9]{16}$/);
      expect(second).toMatch(/^[a-f0-9]{16}$/);
      expect(first).not.toBe(second);
    });
  });

  describe('parseTraceparent', () => {
    it('parses valid W3C traceparent format', () => {
      const parsed = parseTraceparent('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');

      expect(parsed).toEqual({
        version: '00',
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        parentSpanId: '00f067aa0ba902b7',
        flags: '01',
      });
    });

    it('normalizes uppercase hex input to lowercase', () => {
      const parsed = parseTraceparent('0A-4BF92F3577B34DA6A3CE929D0E0E4736-00F067AA0BA902B7-FF');

      expect(parsed).toEqual({
        version: '0a',
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        parentSpanId: '00f067aa0ba902b7',
        flags: 'ff',
      });
    });

    it('returns null for invalid inputs', () => {
      expect(parseTraceparent(null)).toBeNull();
      expect(parseTraceparent(undefined)).toBeNull();
      expect(parseTraceparent(123)).toBeNull();
      expect(parseTraceparent('00-4bf92f3577b34da6a3ce929d0e0e4736-01')).toBeNull();
      expect(
        parseTraceparent('0g-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01')
      ).toBeNull();
      expect(
        parseTraceparent('00-00000000000000000000000000000000-00f067aa0ba902b7-01')
      ).toBeNull();
      expect(
        parseTraceparent('00-4bf92f3577b34da6a3ce929d0e0e4736-0000000000000000-01')
      ).toBeNull();
      expect(
        parseTraceparent('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-zz')
      ).toBeNull();
    });
  });

  describe('createTraceparent', () => {
    it('creates traceparent with defaults', () => {
      const traceparent = createTraceparent('4bf92f3577b34da6a3ce929d0e0e4736', '00f067aa0ba902b7');

      expect(traceparent).toBe('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');
    });

    it('creates traceparent with explicit flags and version', () => {
      const traceparent = createTraceparent(
        '4bf92f3577b34da6a3ce929d0e0e4736',
        '00f067aa0ba902b7',
        'ab',
        'cd'
      );

      expect(traceparent).toBe('cd-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-ab');
    });
  });

  describe('resolveContextFromHeaders', () => {
    it('uses parsed values from a valid traceparent header', () => {
      const headers = new Headers({
        traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      });

      const context = resolveContextFromHeaders(headers);

      expect(context).toEqual({
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        parentSpanId: '00f067aa0ba902b7',
        tracestate: '',
        flags: '01',
        version: '00',
      });
    });

    it('generates fallback context when traceparent is absent', () => {
      const context = resolveContextFromHeaders(new Headers());

      expect(context.traceId).toMatch(/^[a-f0-9]{32}$/);
      expect(context.parentSpanId).toBeNull();
      expect(context.tracestate).toBe('');
      expect(context.flags).toBe('01');
      expect(context.version).toBe('00');
    });

    it('passes through tracestate header value', () => {
      const headers = new Headers({ tracestate: 'vendor1=value1,vendor2=value2' });

      const context = resolveContextFromHeaders(headers);

      expect(context.tracestate).toBe('vendor1=value1,vendor2=value2');
    });

    it('handles null and undefined headers gracefully', () => {
      const nullContext = resolveContextFromHeaders(null);
      const undefinedContext = resolveContextFromHeaders(undefined);

      expect(nullContext.traceId).toMatch(/^[a-f0-9]{32}$/);
      expect(nullContext.parentSpanId).toBeNull();
      expect(undefinedContext.traceId).toMatch(/^[a-f0-9]{32}$/);
      expect(undefinedContext.parentSpanId).toBeNull();
    });
  });

  describe('propagateTraceContext', () => {
    it('adds traceparent header and generates a new spanId', () => {
      const request = {
        method: 'GET',
        headers: new Headers({
          traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
        }),
      };

      const result = propagateTraceContext(request);

      expect(result.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
      expect(result.parentSpanId).toBe('00f067aa0ba902b7');
      expect(result.spanId).toMatch(/^[a-f0-9]{16}$/);
      expect(result.spanId).not.toBe('00f067aa0ba902b7');
      expect(result.traceparent).toBe(`00-4bf92f3577b34da6a3ce929d0e0e4736-${result.spanId}-01`);
      expect(result.headers.get('traceparent')).toBe(result.traceparent);
    });

    it('preserves tracestate when present', () => {
      const request = {
        method: 'GET',
        headers: new Headers({
          tracestate: 'vendorA=abc',
        }),
      };

      const result = propagateTraceContext(request);

      expect(result.tracestate).toBe('vendorA=abc');
      expect(result.headers.get('tracestate')).toBe('vendorA=abc');
    });

    it('uses context overrides when provided', () => {
      const request = {
        method: 'GET',
        headers: new Headers({
          traceparent: '00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01',
        }),
      };

      const result = propagateTraceContext(request, {
        traceId: 'cccccccccccccccccccccccccccccccc',
        spanId: 'dddddddddddddddd',
        flags: '03',
        version: 'ff',
      });

      expect(result.traceId).toBe('cccccccccccccccccccccccccccccccc');
      expect(result.spanId).toBe('dddddddddddddddd');
      expect(result.traceparent).toBe('ff-cccccccccccccccccccccccccccccccc-dddddddddddddddd-03');
    });
  });

  describe('startRouteSpan', () => {
    it('creates a span with expected tracing and request properties', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

      const request = {
        method: 'GET',
        headers: new Headers({
          traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
          tracestate: 'vendorA=abc',
        }),
      };

      const span = startRouteSpan(request, '/health');

      expect(span.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
      expect(span.spanId).toMatch(/^[a-f0-9]{16}$/);
      expect(span.parentSpanId).toBe('00f067aa0ba902b7');
      expect(span.route).toBe('/health');
      expect(span.method).toBe('GET');
      expect(span.startedAt).toBe(Date.now());
      expect(span.traceparent).toBe(`00-4bf92f3577b34da6a3ce929d0e0e4736-${span.spanId}-01`);
      expect(span.tracestate).toBe('vendorA=abc');
      expect(span.headers).toBeInstanceOf(Headers);
      expect(span.headers.get('traceparent')).toBe(span.traceparent);
    });
  });

  describe('finishRouteSpan', () => {
    it('adds duration, ISO startedAt, status code, and preserves span fields', () => {
      jest.useFakeTimers();
      const baseTime = new Date('2026-01-01T00:00:00.000Z');
      jest.setSystemTime(baseTime);

      const span = {
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        spanId: '00f067aa0ba902b7',
        parentSpanId: '70f067aa0ba902b7',
        route: '/api',
        method: 'POST',
        startedAt: Date.now(),
        traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      };

      jest.advanceTimersByTime(125);
      const finished = finishRouteSpan(span, 201, { custom: 'value' });

      expect(finished.traceId).toBe(span.traceId);
      expect(finished.spanId).toBe(span.spanId);
      expect(finished.parentSpanId).toBe(span.parentSpanId);
      expect(finished.route).toBe(span.route);
      expect(finished.method).toBe(span.method);
      expect(finished.statusCode).toBe(201);
      expect(finished.durationMs).toBe(125);
      expect(finished.startedAt).toBe(baseTime.toISOString());
      expect(finished.traceparent).toBe(span.traceparent);
      expect(finished.custom).toBe('value');
    });
  });

  describe('withRouteSpan', () => {
    it('happy path: calls handler, finishes span, invokes onSpanFinish, returns response and span', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

      const request = { method: 'GET', headers: new Headers() };
      const response = { status: 204, body: 'ok' };
      const onSpanFinish = jest.fn().mockResolvedValue(undefined);
      const handler = jest.fn().mockResolvedValue(response);

      const result = await withRouteSpan(request, '/ok', handler, { onSpanFinish });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ route: '/ok', method: 'GET' })
      );
      expect(onSpanFinish).toHaveBeenCalledTimes(1);
      expect(onSpanFinish).toHaveBeenCalledWith(
        expect.objectContaining({
          route: '/ok',
          method: 'GET',
          statusCode: 204,
          traceId: expect.stringMatching(/^[a-f0-9]{32}$/),
          spanId: expect.stringMatching(/^[a-f0-9]{16}$/),
        })
      );
      expect(result).toEqual({
        response,
        span: expect.objectContaining({ statusCode: 204, route: '/ok', method: 'GET' }),
      });
    });

    it('error path: finishes span with 500 and error message, invokes onSpanFinish, then rethrows', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

      const request = { method: 'POST', headers: new Headers() };
      const error = new Error('boom');
      const onSpanFinish = jest.fn().mockResolvedValue(undefined);
      const handler = jest.fn().mockRejectedValue(error);

      await expect(withRouteSpan(request, '/fail', handler, { onSpanFinish })).rejects.toThrow(
        'boom'
      );

      expect(handler).toHaveBeenCalledTimes(1);
      expect(onSpanFinish).toHaveBeenCalledTimes(1);
      expect(onSpanFinish).toHaveBeenCalledWith(
        expect.objectContaining({
          route: '/fail',
          method: 'POST',
          statusCode: 500,
          error: 'boom',
        })
      );
    });

    it('works without onSpanFinish option', async () => {
      const request = { method: 'GET', headers: new Headers() };
      const response = { status: 200 };
      const handler = jest.fn().mockResolvedValue(response);

      const result = await withRouteSpan(request, '/no-callback', handler);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(result.response).toBe(response);
      expect(result.span.statusCode).toBe(200);
      expect(result.span.route).toBe('/no-callback');
    });
  });

  describe('crypto exists but getRandomValues is absent', () => {
    it('falls back to Math.random when crypto has no getRandomValues', () => {
      const origCrypto = global.crypto;
      // crypto object exists but getRandomValues is undefined
      global.crypto = { randomUUID: () => 'fake-uuid' };

      try {
        jest.resetModules();
        const tracingFallback = require('../../../../typescript/portfolio-worker/lib/tracing');
        const traceId = tracingFallback.generateTraceId();
        const spanId = tracingFallback.generateSpanId();

        expect(traceId).toMatch(/^[0-9a-f]{32}$/);
        expect(spanId).toMatch(/^[0-9a-f]{16}$/);
      } finally {
        global.crypto = origCrypto;
      }
    });
  });

  describe('propagateTraceContext - empty tracestate', () => {
    it('does not set tracestate header when tracestate is empty string', () => {
      const request = {
        method: 'GET',
        headers: new Headers({
          traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
        }),
      };

      const result = propagateTraceContext(request);
      // tracestate should be empty string from resolveContextFromHeaders
      expect(result.tracestate).toBe('');
      // Empty tracestate should NOT be set as a header
      expect(result.headers.get('tracestate')).toBeNull();
    });

    it('does not set tracestate header when tracestate is null', () => {
      const request = {
        method: 'GET',
        headers: new Headers(),
      };

      const result = propagateTraceContext(request);
      expect(result.headers.get('tracestate')).toBeNull();
    });
  });

  describe('Math.random fallback', () => {
    it('should generate valid trace IDs when crypto.getRandomValues is unavailable', () => {
      const origCrypto = global.crypto;
      // Remove crypto entirely to force Math.random fallback
      delete global.crypto;

      try {
        jest.resetModules();
        const tracingFallback = require('../../../../typescript/portfolio-worker/lib/tracing');
        const traceId = tracingFallback.generateTraceId();
        const spanId = tracingFallback.generateSpanId();

        // Should still produce valid hex strings
        expect(traceId).toMatch(/^[0-9a-f]{32}$/);
        expect(spanId).toMatch(/^[0-9a-f]{16}$/);
      } finally {
        global.crypto = origCrypto;
      }
    });

    it('should generate unique IDs with Math.random fallback', () => {
      const origCrypto = global.crypto;
      delete global.crypto;

      try {
        jest.resetModules();
        const tracingFallback = require('../../../../typescript/portfolio-worker/lib/tracing');
        const ids = new Set();
        for (let i = 0; i < 20; i++) {
          ids.add(tracingFallback.generateTraceId());
        }
        // With 20 random IDs, they should all be unique
        expect(ids.size).toBe(20);
      } finally {
        global.crypto = origCrypto;
      }
    });
  });
});
