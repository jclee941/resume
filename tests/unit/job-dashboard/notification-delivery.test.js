const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { DatabaseSync } = require('node:sqlite');

describe('notification queue delivery', () => {
  let consumer;
  let database;
  let env;
  let fetchMock;
  const realFetch = globalThis.fetch;
  const now = Date.parse('2026-11-10T12:00:00Z');
  const message = (type = 'telegram', postingId) => ({
    id: 'queue-delivery',
    body: {
      id: postingId ? `public-job:${postingId}` : 'generic-notification',
      type,
      priority: 'normal',
      payload: {
        text: '<b>Engineer &amp; Developer</b>',
        ...(postingId ? { postingId } : {}),
        job: { position: 'Engineer', company: 'Example', source: 'wanted' },
        matchScore: 80,
        requestId: 'approval-1',
      },
      createdAt: now - 10000,
    },
    attempts: 1,
    ack: jest.fn(),
    retry: jest.fn(),
  });
  const deliver = (...messages) => consumer.queue({ queue: 'notifications', messages }, env);
  const receipt = (id = 'public-job:posting-1') =>
    database.prepare('SELECT * FROM notification_history WHERE id = ?').get(id);

  beforeAll(async () => {
    ({ default: consumer } =
      await import('../../../apps/job-dashboard/src/queues/notification-consumer.js'));
  });

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(now);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    database = new DatabaseSync(':memory:');
    database.exec(readFileSync(join(__dirname, '../../../apps/job-dashboard/schema.sql'), 'utf8'));
    const kv = new Map();
    env = {
      TELEGRAM_BOT_TOKEN: 'fake-token',
      TELEGRAM_CHAT_ID: '1',
      SESSIONS: {
        get: jest.fn(async (key) => kv.get(key) || null),
        put: jest.fn(async (key, value) => kv.set(key, JSON.parse(value))),
      },
      JOB_DB: {
        prepare: jest.fn((sql) => ({
          bind: (...values) => ({
            first: async () => database.prepare(sql).get(...values) || null,
            run: async () => ({ meta: database.prepare(sql).run(...values) }),
          }),
        })),
      },
    };
    fetchMock = jest.fn(async () => Response.json({ ok: true, result: { message_id: 42 } }));
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    database.close();
    jest.restoreAllMocks();
  });

  test.each(['telegram', 'approval'])('%s retries an unconfigured delivery', async (type) => {
    delete env.TELEGRAM_BOT_TOKEN;
    const msg = message(type);
    expect(await deliver(msg)).toEqual({ processed: 0, failed: 1, retries: 1 });
    expect(msg.ack).not.toHaveBeenCalled();
    expect(msg.retry).toHaveBeenCalledWith();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test.each(['telegram', 'approval'])('%s preserves rate-limit delay in seconds', async (type) => {
    env.SESSIONS.get.mockResolvedValue({ tokens: 0.5, lastRefill: now });
    const msg = message(type);
    expect(await deliver(msg)).toEqual({ processed: 0, failed: 1, retries: 1 });
    expect(msg.ack).not.toHaveBeenCalled();
    expect(msg.retry).toHaveBeenCalledWith({ delaySeconds: 2 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test.each(['telegram', 'approval'])('%s retries a rejected Telegram delivery', async (type) => {
    fetchMock.mockResolvedValue(new Response('Forbidden', { status: 403 }));
    const msg = message(type);
    expect(await deliver(msg)).toEqual({ processed: 0, failed: 1, retries: 1 });
    expect(msg.ack).not.toHaveBeenCalled();
    expect(msg.retry).toHaveBeenCalledTimes(1);
  });

  test('stores the stable posting receipt with actual delivery results before ACK', async () => {
    const msg = message('telegram', 'posting-1');
    msg.ack.mockImplementation(() => expect(receipt().status).toBe('success'));
    const startedAt = new Date().toISOString();
    expect(await deliver(msg)).toEqual({ processed: 1, failed: 0, retries: 0 });
    expect(receipt()).toMatchObject({
      id: 'public-job:posting-1',
      event_type: 'public_job',
      data: JSON.stringify({ postingId: 'posting-1' }),
      channels: '["telegram"]',
      status: 'success',
      results: JSON.stringify({ telegram: { sent: true, messageId: 42, attempts: 1 } }),
    });
    expect(receipt().timestamp >= startedAt).toBe(true);
    expect(receipt().timestamp <= new Date().toISOString()).toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      text: msg.body.payload.text,
      parse_mode: 'HTML',
    });
    expect(msg.ack).toHaveBeenCalledTimes(1);
  });

  test('a successful stable receipt suppresses duplicate Telegram delivery', async () => {
    const first = message('telegram', 'posting-1');
    await deliver(first);
    const duplicate = message('telegram', 'posting-1');
    expect(await deliver(duplicate)).toEqual({ processed: 1, failed: 0, retries: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(duplicate.ack).toHaveBeenCalledTimes(1);
    expect(duplicate.retry).not.toHaveBeenCalled();
  });

  test('a failed posting delivery records failure and can later become successful', async () => {
    fetchMock.mockResolvedValueOnce(new Response('Forbidden', { status: 403 }));
    const failed = message('telegram', 'posting-1');
    expect(await deliver(failed)).toEqual({ processed: 0, failed: 1, retries: 1 });
    expect(receipt().status).toBe('failed');
    expect(JSON.parse(receipt().results).telegram).toMatchObject({ sent: false, status: 403 });
    expect(failed.ack).not.toHaveBeenCalled();
    const retry = message('telegram', 'posting-1');
    expect(await deliver(retry)).toEqual({ processed: 1, failed: 0, retries: 0 });
    expect(receipt().status).toBe('success');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(retry.ack).toHaveBeenCalledTimes(1);
  });

  test('receipt write errors retry rather than acknowledging unrecorded delivery', async () => {
    env.JOB_DB.prepare.mockImplementation((sql) => ({
      bind: () => ({
        first: async () => null,
        run: async () => {
          throw new Error(`D1 unavailable: ${sql.split(' ')[0]}`);
        },
      }),
    }));
    const msg = message('telegram', 'posting-1');
    expect(await deliver(msg)).toEqual({ processed: 0, failed: 1, retries: 1 });
    expect(msg.ack).not.toHaveBeenCalled();
    expect(msg.retry).toHaveBeenCalledTimes(1);
  });

  test('generic Telegram delivery stays independent of posting history', async () => {
    const msg = message();
    expect(await deliver(msg)).toEqual({ processed: 1, failed: 0, retries: 0 });
    expect(env.JOB_DB.prepare).not.toHaveBeenCalled();
    expect(msg.ack).toHaveBeenCalledTimes(1);
  });
});
