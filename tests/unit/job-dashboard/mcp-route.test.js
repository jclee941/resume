const ADMIN_TOKEN = 'mcp-route-admin-token';
const META = {
  'io.modelcontextprotocol/protocolVersion': '2026-07-28',
  'io.modelcontextprotocol/clientCapabilities': {},
};

describe('job-dashboard /job/mcp route', () => {
  let worker;

  beforeAll(async () => {
    jest.unstable_mockModule(
      'cloudflare:workers',
      () => ({ DurableObject: class {}, WorkflowEntrypoint: class {} }),
      { virtual: true }
    );
    ({ default: worker } = await import('../../../apps/job-dashboard/src/index.js'));
  });

  function memoryKv() {
    const store = new Map();
    return {
      store,
      get: async (key) => (store.has(key) ? JSON.parse(store.get(key)) : null),
      put: async (key, value) => void store.set(key, value),
    };
  }

  function discover(headers = {}, env = { ADMIN_TOKEN }) {
    const request = new Request('https://resume.jclee.me/job/mcp', {
      method: 'POST',
      headers: {
        host: 'resume.jclee.me',
        authorization: `Bearer ${ADMIN_TOKEN}`,
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        'mcp-protocol-version': '2026-07-28',
        'mcp-method': 'server/discover',
        ...headers,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'server/discover',
        params: { _meta: META },
      }),
    });
    return worker.fetch(request, env, { waitUntil: jest.fn() });
  }

  test('serves the MCP endpoint behind the Bearer token without a CSRF token or CORS headers', async () => {
    const kv = memoryKv();

    const response = await discover(
      { origin: 'https://resume.jclee.me' },
      { ADMIN_TOKEN, RATE_LIMIT_KV: kv }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(response.headers.get('x-ratelimit-limit')).toBe('80');
    const { result } = await response.json();
    expect(result._meta['io.modelcontextprotocol/serverInfo'].name).toBe('job-mcp-server');
  });

  test('rejects a request without the Bearer token', async () => {
    const response = await discover({ authorization: '' });

    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toMatch(/^Bearer/);
  });

  test('a valid admin session token sent as Bearer gets 401 and runs no tool', async () => {
    const { mintSessionToken } = await import('../../../apps/job-dashboard/src/services/auth.js');
    const session = await mintSessionToken({ ADMIN_TOKEN });
    const request = new Request('https://resume.jclee.me/job/mcp', {
      method: 'POST',
      headers: {
        host: 'resume.jclee.me',
        authorization: `Bearer ${session}`,
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        'mcp-protocol-version': '2026-07-28',
        'mcp-method': 'tools/list',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: { _meta: META },
      }),
    });

    const response = await worker.fetch(request, { ADMIN_TOKEN }, { waitUntil: jest.fn() });

    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toBe('Bearer');
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
  });

  test('answers OPTIONS with 405 and no CORS preflight headers', async () => {
    const request = new Request('https://resume.jclee.me/job/mcp', {
      method: 'OPTIONS',
      headers: { host: 'resume.jclee.me', origin: 'https://resume.jclee.me' },
    });

    const response = await worker.fetch(request, { ADMIN_TOKEN }, { waitUntil: jest.fn() });

    expect(response.status).toBe(405);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  test('applies rate limiting before authentication', async () => {
    const blockedKv = {
      get: async (key) =>
        key.endsWith(':block') ? { until: Math.floor(Date.now() / 1000) + 60 } : null,
      put: async () => {},
    };

    const response = await discover({}, { ADMIN_TOKEN, RATE_LIMIT_KV: blockedKv });

    expect(response.status).toBe(429);
  });
});
