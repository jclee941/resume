describe('job-dashboard exported queue entry routing', () => {
  let worker;
  let fetchMock;
  const realFetch = globalThis.fetch;

  beforeAll(async () => {
    jest.unstable_mockModule(
      'cloudflare:workers',
      () => ({ DurableObject: class {}, WorkflowEntrypoint: class {} }),
      { virtual: true }
    );
    ({ default: worker } = await import('../../../apps/job-dashboard/src/index.js'));
  });

  beforeEach(() => {
    fetchMock = jest.fn(async () => new Response(JSON.stringify({ ok: true, result: {} })));
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  const message = (body, attempts = 1) => ({
    id: `m-${Math.random()}`,
    body,
    attempts,
    ack: jest.fn(),
    retry: jest.fn(),
  });
  const ctx = () => ({ waitUntil: jest.fn() });

  function workflowEnv() {
    const binding = () => ({ create: jest.fn(async () => ({ id: 'wf-1' })) });
    return {
      SESSIONS: { get: jest.fn(async () => null), put: jest.fn(async () => {}) },
      JOB_CRAWLING_WORKFLOW: binding(),
      APPLICATION_WORKFLOW: binding(),
      RESUME_SYNC_WORKFLOW: binding(),
      DAILY_REPORT_WORKFLOW: binding(),
      CLEANUP_WORKFLOW: binding(),
    };
  }

  test('notifications batch goes through the notification consumer, not the crawl dispatcher', async () => {
    const env = { ...workflowEnv(), TELEGRAM_BOT_TOKEN: 'fake-token', TELEGRAM_CHAT_ID: '1' };
    const ok = message({ id: 'n1', type: 'telegram', priority: 'normal', payload: { text: 'hi' } });
    const bad = message({ id: 'n2', type: 'carrier-pigeon', priority: 'normal', payload: {} });

    await worker.queue({ queue: 'notifications', messages: [ok, bad] }, env, ctx());

    expect(ok.ack).toHaveBeenCalledTimes(1);
    expect(ok.retry).not.toHaveBeenCalled();
    expect(bad.retry).toHaveBeenCalledTimes(1);
    expect(bad.ack).not.toHaveBeenCalled();
    expect(env.JOB_CRAWLING_WORKFLOW.create).not.toHaveBeenCalled();
    for (const call of fetchMock.mock.calls) {
      expect(String(call[0])).toContain('api.telegram.org');
    }
  });

  test('malformed notification message is retried while valid ones are still delivered', async () => {
    const env = { ...workflowEnv(), TELEGRAM_BOT_TOKEN: 'fake-token', TELEGRAM_CHAT_ID: '1' };
    const ok = message({ id: 'n1', type: 'telegram', priority: 'normal', payload: { text: 'hi' } });
    const empty = message(undefined);

    await worker.queue({ queue: 'notifications', messages: [empty, ok] }, env, ctx());

    expect(ok.ack).toHaveBeenCalledTimes(1);
    expect(empty.ack).not.toHaveBeenCalled();
    expect(empty.retry).toHaveBeenCalledTimes(1);
  });

  test('crawl-tasks batch still dispatches crawl workflows', async () => {
    const env = workflowEnv();
    const msg = message({ type: 'crawl', payload: { platforms: ['wanted'] } });

    await worker.queue({ queue: 'crawl-tasks', messages: [msg] }, env, ctx());

    expect(env.JOB_CRAWLING_WORKFLOW.create).toHaveBeenCalledTimes(1);
    expect(msg.ack).toHaveBeenCalledTimes(1);
    expect(msg.retry).not.toHaveBeenCalled();
  });

  test('unknown crawl message type is retried, never acknowledged', async () => {
    const env = workflowEnv();
    const msg = message({ type: 'telegram', payload: { text: 'x' } });

    await worker.queue({ queue: 'crawl-tasks', messages: [msg] }, env, ctx());

    expect(msg.ack).not.toHaveBeenCalled();
    expect(msg.retry).toHaveBeenCalledTimes(1);
  });

  test('unknown queue name throws without acking or retrying silently', async () => {
    const env = workflowEnv();
    const msg = message({ type: 'crawl', payload: {} });

    await expect(
      worker.queue({ queue: 'mystery-queue', messages: [msg] }, env, ctx())
    ).rejects.toThrow(/mystery-queue/);

    expect(msg.ack).not.toHaveBeenCalled();
    expect(env.JOB_CRAWLING_WORKFLOW.create).not.toHaveBeenCalled();
  });
});
