/**
 * Contract tests for Elasticsearch client
 */

let mod;

beforeAll(async () => {
  mod = await import('@resume/shared/es-client');
});

describe('Elasticsearch Client', () => {
  const mockEnv = {
    ELASTICSEARCH_URL: 'https://es.example.com',
    ELASTICSEARCH_API_KEY: 'test-api-key',
    ELASTICSEARCH_INDEX: 'test-index',
  };

  beforeEach(() => {
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ result: 'created' }),
      })
    );
    jest.useFakeTimers();
  });

  afterEach(async () => {
    // Clean up queue between tests if possible
    if (mod && mod.flush) {
      await mod.flush(mockEnv);
    }
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test('named exports exist', () => {
    expect(mod.logToElasticsearch).toBeDefined();
    expect(mod.logRequest).toBeDefined();
    expect(mod.logResponse).toBeDefined();
    expect(mod.logError).toBeDefined();
    expect(mod.logEvent).toBeDefined();
    expect(mod.flush).toBeDefined();
    expect(mod.generateRequestId).toBeDefined();
  });

  test('default export contains all methods', () => {
    const es = mod.default;
    expect(es.logToElasticsearch).toBe(mod.logToElasticsearch);
    expect(es.logRequest).toBe(mod.logRequest);
    expect(es.logResponse).toBe(mod.logResponse);
    expect(es.logError).toBe(mod.logError);
    expect(es.logEvent).toBe(mod.logEvent);
    expect(es.flush).toBe(mod.flush);
    expect(es.generateRequestId).toBe(mod.generateRequestId);
  });

  test('generateRequestId() returns unique string IDs', () => {
    const id1 = mod.generateRequestId();
    const id2 = mod.generateRequestId();
    expect(typeof id1).toBe('string');
    expect(id1).toContain('-');
    expect(id1).not.toBe(id2);
  });

  test('logToElasticsearch (immediate: true) calls fetch with correct details', async () => {
    await mod.logToElasticsearch(
      mockEnv,
      'test message',
      'INFO',
      { foo: 'bar' },
      { immediate: true }
    );

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = global.fetch.mock.calls[0];

    expect(url).toBe('https://es.example.com/test-index/_doc');
    expect(init.method).toBe('POST');
    expect(init.headers['Authorization']).toBe('ApiKey test-api-key');
    expect(init.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(init.body);
    expect(body.message).toBe('test message');
    expect(body.log.level).toBe('info');
    expect(body.foo).toBe('bar');
    expect(body['@timestamp']).toBeDefined();
    expect(body.ecs.version).toBe('8.11');
  });

  test('logToElasticsearch (immediate: true) with CF Access headers', async () => {
    const cfEnv = {
      ...mockEnv,
      CF_ACCESS_CLIENT_ID: 'cf-id',
      CF_ACCESS_CLIENT_SECRET: 'cf-secret',
    };
    await mod.logToElasticsearch(cfEnv, 'msg', 'INFO', {}, { immediate: true });

    const [, init] = global.fetch.mock.calls[0];
    expect(init.headers['CF-Access-Client-Id']).toBe('cf-id');
    expect(init.headers['CF-Access-Client-Secret']).toBe('cf-secret');
  });

  test('logToElasticsearch (no-op) when missing env', async () => {
    await mod.logToElasticsearch({}, 'msg', 'INFO', {}, { immediate: true });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('logToElasticsearch (batched) does not call fetch immediately', async () => {
    await mod.logToElasticsearch(mockEnv, 'batched msg');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('logToElasticsearch trims queue when push causes size overflow', async () => {
    const originalPush = Array.prototype.push;
    Array.prototype.push = function patchedPush(...items) {
      const result = originalPush.apply(this, items);
      if (items[0]?.service?.name === 'overflow-test') {
        this.length = 1001;
      }
      return result;
    };

    try {
      await mod.logToElasticsearch(mockEnv, 'overflow msg', 'INFO', {}, { job: 'overflow-test' });
      expect(global.fetch).toHaveBeenCalled();
    } finally {
      Array.prototype.push = originalPush;
    }
  });

  test('logToElasticsearch timer flush executes callback branch', async () => {
    await mod.logToElasticsearch(mockEnv, 'timer msg');
    expect(global.fetch).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1000);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][0]).toContain('_bulk');
  });

  test('logRequest calls logToElasticsearch with request details', async () => {
    const mockReq = {
      method: 'GET',
      headers: { get: (name) => (name === 'user-agent' ? 'test-ua' : null) },
      cf: { country: 'KR', city: 'Seoul', asn: 12345 },
    };
    const mockUrl = { pathname: '/test-path', search: '?q=1' };

    await mod.logRequest(mockEnv, mockReq, mockUrl, { immediate: true });

    expect(global.fetch).toHaveBeenCalled();
    const [, init] = global.fetch.mock.calls[0];
    const body = JSON.parse(init.body);

    expect(body.message).toBe('GET /test-path');
    expect(body.http.request.method).toBe('GET');
    expect(body.url.path).toBe('/test-path');
    expect(body.user_agent.original).toBe('test-ua');
    expect(body.client.geo.country_iso_code).toBe('KR');
  });

  test('logResponse calls logToElasticsearch with status and duration', async () => {
    const mockReq = { method: 'POST' };
    const mockRes = { status: 200 };
    const startTime = Date.now() - 100;

    await mod.logResponse(mockEnv, mockReq, mockRes, { startTime });

    expect(global.fetch).toHaveBeenCalled();
    const [, init] = global.fetch.mock.calls[0];
    const body = JSON.parse(init.body);

    expect(body.http.response.status_code).toBe(200);
    expect(body.event.duration).toBeGreaterThanOrEqual(100 * 1_000_000);
    expect(body.event.outcome).toBe('success');
  });

  test('logError calls logToElasticsearch with error details', async () => {
    const error = new Error('boom');
    error.name = 'TestError';
    error.stack = 'stack trace content';

    await mod.logError(mockEnv, error, { extra: 'ctx' });

    expect(global.fetch).toHaveBeenCalled();
    const [, init] = global.fetch.mock.calls[0];
    const body = JSON.parse(init.body);

    expect(body.log.level).toBe('error');
    expect(body.error.type).toBe('TestError');
    expect(body.error.message).toBe('boom');
    expect(body.error.stack_trace).toBe('stack trace content');
    expect(body.extra).toBe('ctx');
  });

  test('logEvent calls logToElasticsearch with action', async () => {
    await mod.logEvent(mockEnv, 'user_login', { user_id: 123 }, { immediate: true });

    const [, init] = global.fetch.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.event.action).toBe('user_login');
    expect(body.user_id).toBe(123);
  });

  test('logEvent does not throw when logToElasticsearch rejects', async () => {
    // Force fetch to throw synchronously to bypass the internal try/catch.
    // This simulates an edge case where the promise chain rejects.
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation(() => {
      throw new Error('ES network failure');
    });

    await expect(
      mod.logEvent(mockEnv, 'user_login', { user_id: 123 }, { immediate: true })
    ).resolves.not.toThrow();

    global.fetch = originalFetch;
  });

  test('logEvent returns a resolved promise even when ES fails', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation(() => {
      throw new Error('timeout');
    });

    const result = mod.logEvent(mockEnv, 'test_event', {}, { immediate: true });
    await expect(result).resolves.toBeUndefined();

    global.fetch = originalFetch;
  });

  test('logEvent warns when logToElasticsearch promise rejects', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const throwingOptions = new Proxy(
      {},
      {
        get() {
          throw new Error('options getter failure');
        },
      }
    );

    await expect(mod.logEvent(mockEnv, 'evt', {}, throwingOptions)).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][1]).toBe('logEvent failed to write to Elasticsearch');
    warnSpy.mockRestore();
  });

  test('flush clears queue via _bulk', async () => {
    // Fill queue
    for (let i = 0; i < 5; i++) {
      await mod.logToElasticsearch(mockEnv, `msg ${i}`);
    }
    expect(global.fetch).not.toHaveBeenCalled();

    await mod.flush(mockEnv);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('https://es.example.com/_bulk');
    expect(init.headers['Content-Type']).toBe('application/x-ndjson');
    expect(init.body.split('\n').filter(Boolean).length).toBe(10); // (action + doc) * 5
  });

  test('constants behavior: BATCH_SIZE=10', async () => {
    // afterEach flushes, so queue should be empty here
    for (let i = 0; i < 9; i++) {
      await mod.logToElasticsearch(mockEnv, `msg ${i}`);
    }
    expect(global.fetch).not.toHaveBeenCalled();

    await mod.logToElasticsearch(mockEnv, 'msg 9');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][0]).toContain('_bulk');
  });

  test('constants verify via source (reasonable values)', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const sourcePath = path.resolve(
      __dirname,
      '../../../packages/shared/src/clients/elasticsearch/index.js'
    );
    const content = fs.readFileSync(sourcePath, 'utf8');

    expect(content).toContain('const DEFAULT_TIMEOUT_MS = 5000;');
    expect(content).toContain('const BATCH_SIZE = 10;');
    expect(content).toContain('const MAX_QUEUE_SIZE = 1000;');
  });
});
