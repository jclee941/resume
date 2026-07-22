describe('job-dashboard Queue routes', () => {
  const ADMIN_TOKEN = 'queue-admin-token';
  const CSRF_TOKEN = 'queue-csrf-token';
  let worker;

  beforeAll(async () => {
    jest.unstable_mockModule(
      'cloudflare:workers',
      () => ({ DurableObject: class {}, WorkflowEntrypoint: class {} }),
      { virtual: true }
    );
    ({ default: worker } = await import('../../../apps/job-dashboard/src/index.js'));
  });

  async function dispatch(path, env = {}, init = {}) {
    const request = new Request(`https://example.com${path}`, init);
    return worker.fetch(request, env, { waitUntil: jest.fn() });
  }

  function enqueueRequest(body, env = {}, headers = {}) {
    return dispatch('/api/queue/enqueue', env, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ADMIN_TOKEN}`,
        Cookie: `csrf_token=${CSRF_TOKEN}`,
        'X-CSRF-Token': CSRF_TOKEN,
        'Content-Type': 'application/json',
        ...headers,
      },
      body,
    });
  }

  test('keeps queue status public when authentication is unavailable', async () => {
    // Given: no authentication or Queue bindings
    const env = {};

    // When: the public capability route is requested
    const response = await dispatch('/api/queue/status', env);

    // Then: Queue unavailability is disclosed without an authentication error
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      status: 'disabled',
      available: false,
      queue: 'crawl-tasks',
    });
  });

  test('reports enabled queue capabilities publicly', async () => {
    // Given: a Queue binding
    const env = { CRAWL_TASKS: { send: jest.fn() } };

    // When: the public capability route is requested
    const response = await dispatch('/api/queue/status', env);

    // Then: supported message enums are advertised
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      available: true,
      queue: 'crawl-tasks',
      types: ['crawl', 'apply', 'sync', 'report', 'cleanup'],
      priorities: ['urgent', 'background'],
    });
  });

  test('returns authentication unavailable before CSRF and payload parsing', async () => {
    // Given: no ADMIN_TOKEN, no CSRF token, and malformed JSON
    const request = { method: 'POST', body: '{' };

    // When: enqueue is requested
    const response = await dispatch('/api/queue/enqueue', {}, request);

    // Then: authentication capability fails first
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'Authentication unavailable',
      status: 'disabled',
      available: false,
    });
  });

  test('returns unauthorized before CSRF when ADMIN_TOKEN is configured without SESSIONS', async () => {
    // Given: ADMIN_TOKEN without SESSIONS and no credentials or CSRF token
    const env = { ADMIN_TOKEN };

    // When: enqueue is requested
    const response = await dispatch('/api/queue/enqueue', env, { method: 'POST', body: '{' });

    // Then: authentication fails before CSRF and parsing
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  test.each([
    ['missing', {}, 'CSRF token missing'],
    ['mismatched', { Cookie: 'csrf_token=one', 'X-CSRF-Token': 'two' }, 'CSRF token mismatch'],
  ])('returns 403 for %s CSRF before payload parsing', async (_case, csrfHeaders, error) => {
    // Given: valid authentication and invalid CSRF with malformed JSON
    const env = { ADMIN_TOKEN };

    // When: enqueue is requested
    const response = await dispatch('/api/queue/enqueue', env, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, ...csrfHeaders },
      body: '{',
    });

    // Then: CSRF fails before parsing
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error });
  });

  test('rejects malformed JSON after authentication and CSRF', async () => {
    // Given: valid request policy headers and malformed JSON
    const env = { ADMIN_TOKEN };

    // When: enqueue is requested
    const response = await enqueueRequest('{', env);

    // Then: parsing fails with the stable contract
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid JSON payload' });
  });

  test.each(['null', '[]', '"text"'])('rejects non-object body %s', async (body) => {
    // Given: a JSON value that is not an object
    const env = { ADMIN_TOKEN };

    // When: enqueue is requested
    const response = await enqueueRequest(body, env);

    // Then: the object boundary rejects it
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Request body must be an object' });
  });

  test.each([
    [{ payload: {} }, 'Invalid type. Must be one of: crawl, apply, sync, report, cleanup'],
    [
      { type: 'unknown', payload: {} },
      'Invalid type. Must be one of: crawl, apply, sync, report, cleanup',
    ],
    [{ type: 'crawl' }, 'Payload must be a non-null object'],
    [{ type: 'crawl', payload: null }, 'Payload must be a non-null object'],
    [{ type: 'crawl', payload: [] }, 'Payload must be a non-null object'],
    [
      { type: 'crawl', payload: {}, priority: 'normal' },
      'Invalid priority. Must be one of: urgent, background',
    ],
    [
      { type: 'crawl', payload: {}, delaySeconds: -1 },
      'delaySeconds must be an integer between 0 and 43200',
    ],
    [
      { type: 'crawl', payload: {}, delaySeconds: 43201 },
      'delaySeconds must be an integer between 0 and 43200',
    ],
    [
      { type: 'crawl', payload: {}, delaySeconds: 1.5 },
      'delaySeconds must be an integer between 0 and 43200',
    ],
  ])('rejects invalid schema %#', async (input, error) => {
    // Given: an authenticated object outside the Queue schema
    const env = { ADMIN_TOKEN };

    // When: enqueue is requested
    const response = await enqueueRequest(JSON.stringify(input), env);

    // Then: the schema boundary returns its stable error
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error });
  });

  test('returns Queue unavailable after valid auth, CSRF, and payload', async () => {
    // Given: a valid request without a Queue binding
    const env = { ADMIN_TOKEN };
    const body = JSON.stringify({ type: 'crawl', payload: {} });

    // When: enqueue is requested
    const response = await enqueueRequest(body, env);

    // Then: Queue capability fails after parsing
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'Queue unavailable',
      status: 'disabled',
      available: false,
      queue: 'crawl-tasks',
    });
  });

  test.each([0, 43200])('accepts delaySeconds boundary %i', async (delaySeconds) => {
    // Given: a fake Queue binding and valid boundary input
    const send = jest.fn().mockResolvedValue(undefined);
    const env = { ADMIN_TOKEN, CRAWL_TASKS: { send } };
    const body = JSON.stringify({ type: 'cleanup', payload: {}, priority: 'urgent', delaySeconds });

    // When: enqueue is requested
    const response = await enqueueRequest(body, env);

    // Then: the normalized request is accepted once
    expect(response.status).toBe(202);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'cleanup', payload: {}, priority: 'urgent' }),
      { delaySeconds }
    );
  });

  test('enqueues one normalized message with defaults', async () => {
    // Given: a fake Queue binding and input without optional fields
    const send = jest.fn().mockResolvedValue(undefined);
    const env = { ADMIN_TOKEN, CRAWL_TASKS: { send } };
    const body = JSON.stringify({ type: 'crawl', payload: { source: 'manual' } });

    // When: enqueue is requested
    const response = await enqueueRequest(body, env);

    // Then: one normalized message and response expose the defaults
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      success: true,
      status: 'accepted',
      queue: 'crawl-tasks',
      type: 'crawl',
      priority: 'background',
      delaySeconds: 0,
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'crawl',
        payload: { source: 'manual' },
        priority: 'background',
        createdAt: expect.any(Number),
      }),
      { delaySeconds: 0 }
    );
  });
});
