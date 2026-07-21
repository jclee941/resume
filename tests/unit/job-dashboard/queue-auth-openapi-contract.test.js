const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const OPENAPI_PATH = path.resolve(__dirname, '../../../packages/contracts/openapi.yaml');

describe('queue admin auth OpenAPI contract', () => {
  let openApi;

  beforeAll(() => {
    openApi = YAML.parse(fs.readFileSync(OPENAPI_PATH, 'utf8'));
  });

  test('defines the canonical cookie session and legacy bearer schemes', () => {
    expect(openApi.security).toEqual([]);
    expect(openApi.components.securitySchemes).toMatchObject({
      AdminSessionCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'adminToken',
        description: expect.stringContaining('HttpOnly'),
      },
      LegacyAdminBearer: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'ADMIN_TOKEN',
        description: expect.stringContaining('Deprecated'),
      },
    });
  });

  test('requires either supported admin credential plus CSRF for queue enqueue', () => {
    expect(openApi.paths['/api/queue/enqueue'].post.security).toEqual([
      { AdminSessionCookie: [], CsrfHeader: [], CsrfCookie: [] },
      { LegacyAdminBearer: [], CsrfHeader: [], CsrfCookie: [] },
    ]);
  });

  test('keeps queue status public as the capability probe', () => {
    expect(openApi.paths['/api/queue/status'].get.security).toBeUndefined();
  });

  test('documents queue enqueue authentication failures', () => {
    const responses = openApi.paths['/api/queue/enqueue'].post.responses;

    expect(responses['403']).toEqual({
      $ref: '#/components/responses/QueueForbidden',
    });
    expect(responses['401']).toEqual({
      $ref: '#/components/responses/QueueUnauthorized',
    });
    expect(responses['503'].content['application/json'].schema.oneOf).toEqual([
      { $ref: '#/components/schemas/AuthenticationUnavailable' },
      { $ref: '#/components/schemas/QueueUnavailable' },
    ]);
  });

  test('documents queue status capability truth for both availability states', () => {
    const responses = openApi.paths['/api/queue/status'].get.responses;

    expect(responses['200'].content['application/json'].schema).toEqual({
      $ref: '#/components/schemas/QueueStatusEnabled',
    });
    expect(responses['503'].content['application/json'].schema).toEqual({
      $ref: '#/components/schemas/QueueStatusDisabled',
    });
  });

  test('queue enqueue handler returns the documented accepted status', async () => {
    const { registerAdminRoutes } = await import(
      '../../../apps/job-dashboard/src/routes/admin.js'
    );
    let enqueueHandler;
    const router = {
      get: jest.fn(),
      put: jest.fn(),
      post: jest.fn((route, handler) => {
        if (route === '/api/queue/enqueue') enqueueHandler = handler;
      }),
    };
    const send = jest.fn().mockResolvedValue(undefined);
    registerAdminRoutes(router, {
      env: { CRAWL_TASKS: { send } },
      diagnostics: {},
      log: { error: jest.fn() },
    });

    const response = await enqueueHandler(
      new Request('https://example.com/api/queue/enqueue', {
        method: 'POST',
        body: JSON.stringify({ type: 'crawl', payload: { dryRun: true } }),
      })
    );

    expect(response.status).toBe(202);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
