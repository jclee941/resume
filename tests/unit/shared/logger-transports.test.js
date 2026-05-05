/**
 * SSOT-038 — Pluggable transports for the canonical logger.
 *
 * The canonical Logger must:
 *   1. Accept zero/one/many transports via constructor options.
 *   2. Default to the Elasticsearch transport (back-compat with existing
 *      `@resume/shared/logger` consumers that pass nothing).
 *   3. Dispatch every emitted log entry to every configured transport.
 *   4. Not crash when a transport throws — failures must be isolated.
 *   5. Expose Loki and Elasticsearch as separate subpath exports so apps can
 *      swap transports without rewriting their logger usage.
 */

let Logger, RequestContext;

beforeAll(async () => {
  const mod = await import('@resume/shared/logger');
  Logger = mod.Logger;
  RequestContext = mod.RequestContext;
});

describe('Logger pluggable transports — SSOT-038', () => {
  describe('Transport subpath exports', () => {
    test('@resume/shared/logger/transports/elasticsearch exposes a factory', async () => {
      const mod = await import('@resume/shared/logger/transports/elasticsearch');
      expect(typeof mod.createElasticsearchTransport).toBe('function');
    });

    test('@resume/shared/logger/transports/loki exposes a factory', async () => {
      const mod = await import('@resume/shared/logger/transports/loki');
      expect(typeof mod.createLokiTransport).toBe('function');
    });

    test('elasticsearch factory returns a transport with a send() function', async () => {
      const { createElasticsearchTransport } =
        await import('@resume/shared/logger/transports/elasticsearch');
      const t = createElasticsearchTransport();
      expect(typeof t.send).toBe('function');
      expect(t.name).toBe('elasticsearch');
    });

    test('loki factory returns a transport with a send() function', async () => {
      const { createLokiTransport } = await import('@resume/shared/logger/transports/loki');
      const t = createLokiTransport();
      expect(typeof t.send).toBe('function');
      expect(t.name).toBe('loki');
    });
  });

  describe('Custom transport injection', () => {
    test('Logger dispatches every log entry to every configured transport', async () => {
      const sent = [];
      const transportA = {
        name: 'a',
        async send(entry) {
          sent.push(['a', entry.level, entry.message]);
        },
      };
      const transportB = {
        name: 'b',
        async send(entry) {
          sent.push(['b', entry.level, entry.message]);
        },
      };
      const logger = new Logger(
        {},
        {
          service: 'multi-svc',
          transports: [transportA, transportB],
        }
      );

      await logger.info('hello');
      await logger.warn('careful');

      expect(sent).toEqual([
        ['a', 'INFO', 'hello'],
        ['b', 'INFO', 'hello'],
        ['a', 'WARN', 'careful'],
        ['b', 'WARN', 'careful'],
      ]);
    });

    test('transport receives service name in entry', async () => {
      const calls = [];
      const transport = {
        name: 'capture',
        async send(entry) {
          calls.push(entry);
        },
      };
      const logger = new Logger({}, { service: 'svc-x', transports: [transport] });
      await logger.info('hi');

      expect(calls).toHaveLength(1);
      expect(calls[0].service).toBe('svc-x');
      expect(calls[0].level).toBe('INFO');
      expect(calls[0].message).toBe('hi');
    });

    test('transport receives merged labels from logger context + reqCtx + extra', async () => {
      const calls = [];
      const transport = {
        name: 'capture',
        async send(entry) {
          calls.push(entry);
        },
      };
      const reqCtx = new RequestContext({
        method: 'GET',
        path: '/api/x',
        requestId: 'req-001',
      });
      const logger = new Logger(
        {},
        {
          service: 'svc',
          transports: [transport],
          reqCtx,
          context: { component: 'auth' },
        }
      );

      await logger.info('logged in', { user: 'alice' });

      expect(calls).toHaveLength(1);
      const labels = calls[0].labels;
      expect(labels.component).toBe('auth');
      expect(labels.http.request.method).toBe('GET');
      expect(labels.url.path).toBe('/api/x');
      expect(labels.user).toBe('alice');
    });

    test('a throwing transport does not break sibling transports or the caller', async () => {
      const calls = [];
      const failing = {
        name: 'broken',
        async send() {
          throw new Error('transport down');
        },
      };
      const ok = {
        name: 'ok',
        async send(entry) {
          calls.push(entry.message);
        },
      };
      const logger = new Logger({}, { transports: [failing, ok] });

      await expect(logger.info('still works')).resolves.not.toThrow();
      expect(calls).toEqual(['still works']);
    });

    test('child() inherits the transport list', async () => {
      const calls = [];
      const transport = {
        name: 'capture',
        async send(entry) {
          calls.push(entry);
        },
      };
      const parent = new Logger(
        {},
        {
          service: 'parent',
          transports: [transport],
        }
      );
      const child = parent.child({ scope: 'sub' });

      await child.info('child-msg');

      expect(calls).toHaveLength(1);
      expect(calls[0].labels.scope).toBe('sub');
    });

    test('withRequest() preserves the transport list', async () => {
      const calls = [];
      const transport = {
        name: 'capture',
        async send(entry) {
          calls.push(entry);
        },
      };
      const logger = new Logger({}, { transports: [transport] });
      const reqCtx = new RequestContext({ method: 'POST', path: '/x' });
      const bound = logger.withRequest(reqCtx);

      await bound.info('with-req');

      expect(calls).toHaveLength(1);
      expect(calls[0].labels.http.request.method).toBe('POST');
    });

    test('level filtering applies before transport dispatch', async () => {
      const calls = [];
      const transport = {
        name: 'capture',
        async send(entry) {
          calls.push(entry);
        },
      };
      const logger = new Logger(
        {},
        {
          minLevel: 'WARN',
          transports: [transport],
        }
      );

      await logger.debug('skip-me');
      await logger.info('skip-me');
      await logger.warn('keep-me');

      expect(calls).toHaveLength(1);
      expect(calls[0].message).toBe('keep-me');
    });

    test('error() dispatches an entry with error metadata to transports', async () => {
      const calls = [];
      const transport = {
        name: 'capture',
        async send(entry) {
          calls.push(entry);
        },
      };
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const logger = new Logger(
        {},
        {
          service: 'err-test',
          transports: [transport],
        }
      );

      await logger.error('Boom', new Error('detail'));

      expect(calls).toHaveLength(1);
      expect(calls[0].level).toBe('ERROR');
      expect(calls[0].labels.error.type).toBe('AppError');
      expect(calls[0].labels.error.message).toContain('detail');

      consoleSpy.mockRestore();
    });
  });

  describe('Default transport behaviour (back-compat)', () => {
    test('with no transports supplied and no ELASTICSEARCH_URL, info() is still a silent no-op', async () => {
      const logger = new Logger({}, { service: 'default-test' });
      await expect(logger.info('hi')).resolves.not.toThrow();
    });

    test('with no transports supplied but ELASTICSEARCH_URL set, the ES transport is used (fetch is invoked at flush)', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true });
      const env = {
        ELASTICSEARCH_URL: 'https://es.example.com',
        ELASTICSEARCH_API_KEY: 'api-key',
        ELASTICSEARCH_INDEX: 'logs-default',
      };
      const logger = new Logger(env, { service: 'es-default' });

      // immediate=true on error path forces a fetch without batching
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await logger.error('Failure', new Error('boom'));

      expect(fetchSpy).toHaveBeenCalled();
      const [calledUrl] = fetchSpy.mock.calls[0];
      expect(String(calledUrl)).toContain('https://es.example.com');

      fetchSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('Loki transport behaviour', () => {
    test('loki transport sends to LOKI_URL with bearer auth when LOKI_API_KEY present', async () => {
      const { createLokiTransport } = await import('@resume/shared/logger/transports/loki');
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true });

      const transport = createLokiTransport();
      await transport.send({
        level: 'INFO',
        message: 'loki-msg',
        service: 'loki-test',
        labels: { foo: 'bar' },
        env: {
          LOKI_URL: 'https://loki.example.com/loki/api/v1/push',
          LOKI_API_KEY: 'key-xyz',
        },
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [calledUrl, init] = fetchSpy.mock.calls[0];
      expect(String(calledUrl)).toBe('https://loki.example.com/loki/api/v1/push');
      expect(init.method).toBe('POST');
      expect(init.headers.Authorization).toBe('Bearer key-xyz');

      const body = JSON.parse(init.body);
      expect(body.streams).toHaveLength(1);
      expect(body.streams[0].stream.job).toBe('loki-test');
      expect(body.streams[0].stream.level).toBe('INFO');
      expect(body.streams[0].values[0][1]).toBe('loki-msg');

      fetchSpy.mockRestore();
    });

    test('loki transport is a silent no-op when LOKI_API_KEY is missing', async () => {
      const { createLokiTransport } = await import('@resume/shared/logger/transports/loki');
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true });

      const transport = createLokiTransport();
      await transport.send({
        level: 'INFO',
        message: 'no-key',
        service: 'loki-noauth',
        labels: {},
        env: { LOKI_URL: 'https://loki.example.com/api' },
      });

      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });
  });

  describe('ES transport behaviour', () => {
    test('es transport posts to /{index}/_doc with ApiKey auth on immediate entries', async () => {
      const { createElasticsearchTransport } =
        await import('@resume/shared/logger/transports/elasticsearch');
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true });

      const transport = createElasticsearchTransport();
      await transport.send({
        level: 'ERROR',
        message: 'es-msg',
        service: 'es-test',
        labels: { foo: 'bar' },
        env: {
          ELASTICSEARCH_URL: 'https://es.example.com',
          ELASTICSEARCH_API_KEY: 'es-key',
          ELASTICSEARCH_INDEX: 'logs-es-test',
        },
        immediate: true,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [calledUrl, init] = fetchSpy.mock.calls[0];
      expect(String(calledUrl)).toContain('logs-es-test/_doc');
      expect(init.headers.Authorization).toBe('ApiKey es-key');

      fetchSpy.mockRestore();
    });

    test('es transport is a silent no-op when ELASTICSEARCH_URL or ELASTICSEARCH_API_KEY is missing', async () => {
      const { createElasticsearchTransport } =
        await import('@resume/shared/logger/transports/elasticsearch');
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true });

      const transport = createElasticsearchTransport();
      await transport.send({
        level: 'INFO',
        message: 'noop',
        service: 'svc',
        labels: {},
        env: {},
        immediate: true,
      });

      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    test('es transport flush() delegates to underlying ES flush', async () => {
      const { createElasticsearchTransport } = await import(
        '@resume/shared/logger/transports/elasticsearch'
      );
      const transport = createElasticsearchTransport();
      await expect(transport.flush({}, { job: 'svc' })).resolves.not.toThrow();
});
});

  describe('Loki label flattening', () => {
    test('nested label objects are flattened with underscore-joined keys', async () => {
      const { createLokiTransport } = await import('@resume/shared/logger/transports/loki');
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true });

      const transport = createLokiTransport();
      await transport.send({
        level: 'INFO',
        message: 'flatten',
        service: 'flat-svc',
        labels: {
          http: { request: { method: 'GET' } },
          tags: ['a', 'b'],
          count: 42,
          enabled: true,
          maybe: null,
          undef: undefined,
        },
        env: { LOKI_URL: 'https://loki.example.com/api', LOKI_API_KEY: 'k' },
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [, init] = fetchSpy.mock.calls[0];
      const body = JSON.parse(init.body);
      const stream = body.streams[0].stream;
      expect(stream.http_request_method).toBe('GET');
      expect(stream.count).toBe('42');
      expect(stream.enabled).toBe('true');
      expect(stream.tags).toBeUndefined();
      expect(stream.maybe).toBeUndefined();
      expect(stream.undef).toBeUndefined();

      fetchSpy.mockRestore();
    });

    test('loki transport swallows fetch errors silently (fire-and-forget)', async () => {
      const { createLokiTransport } = await import('@resume/shared/logger/transports/loki');
      const fetchSpy = jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new Error('network down'));

      const transport = createLokiTransport();
      await expect(
        transport.send({
          level: 'INFO',
          message: 'fail-quiet',
          service: 'svc',
          labels: {},
          env: { LOKI_API_KEY: 'k' },
        })
      ).resolves.not.toThrow();

      fetchSpy.mockRestore();
    });

    test('loki transport handles missing entry.env, entry.labels, entry.service', async () => {
      const { createLokiTransport } = await import('@resume/shared/logger/transports/loki');
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true
  });

      const transport = createLokiTransport();
      // entry.env undefined exercises the `entry.env || {}` fallback (no-op path)
      await transport.send({ level: 'INFO', message: 'no-env'
});
      expect(fetchSpy).not.toHaveBeenCalled();

      // entry.labels undefined and entry.service undefined exercise their || fallbacks
      await transport.send({
        level: 'INFO',
        message: 'partial',
        env: { LOKI_API_KEY: 'k' },
      });
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [, init] = fetchSpy.mock.calls[0];
      const body = JSON.parse(init.body);
      expect(body.streams[0].stream.job).toBe('default');

      fetchSpy.mockRestore();
    });

    test('es transport flush() works with default options arg', async () => {
      const { createElasticsearchTransport } = await import(
        '@resume/shared/logger/transports/elasticsearch'
      );
      const transport = createElasticsearchTransport();
      // calling flush(env) without options exercises the `options = {}` default branch
      await expect(transport.flush({})).resolves.not.toThrow();
    });

    test('flush() swallows transport failures and never throws', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const failingFlush = {
        name: 'broken',
        async send() {},
        async flush() {
          throw new Error('flush boom');
        },
      };
      const logger = new Logger({}, { transports: [failingFlush] });
      await expect(logger.flush()).resolves.not.toThrow();
      consoleSpy.mockRestore();
    });
  });
});
