import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

import JobQueue, { JobQueue as NamedJobQueue } from '../index.js';

describe('JobQueue', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  it('exports default and named class', () => {
    assert.equal(JobQueue, NamedJobQueue);
  });

  it('uses constructor defaults when options are omitted', () => {
    const queue = new JobQueue();

    assert.equal(queue.maxConcurrentWorkers, 4);
    assert.equal(queue.retry.maxAttempts, 5);
    assert.equal(queue.retry.baseDelayMs, 250);
    assert.equal(queue.retry.maxDelayMs, 30000);
    assert.equal(queue.retry.jitter, true);
    assert.equal(queue.logger, console);
    assert.equal(typeof queue.now(), 'number');
  });

  it('enqueues with defaults and queue send without delay options', async () => {
    const send = mock.fn(async () => {});
    const queue = new JobQueue({ queue: { send }, now: () => 1000 });

    const job = await queue.enqueue({ task: 'a' });

    assert.equal(job.priority, 'normal');
    assert.equal(job.source, undefined);
    assert.equal(job.createdAt, 1000);
    assert.equal(job.availableAt, 1000);
    assert.equal(queue.localQueues.normal.length, 1);
    assert.equal(send.mock.callCount(), 1);
    assert.equal(send.mock.calls[0].arguments[1], undefined);
  });

  it('throws on unsupported priority and enqueues delayed jobs with delaySeconds', async () => {
    const send = mock.fn(async () => {});
    const queue = new JobQueue({ queue: { send }, now: () => 5000 });

    await assert.rejects(
      queue.enqueue({ task: 'x' }, { priority: 'invalid' }),
      /Unsupported priority: invalid/
    );

    const delayed = await queue.enqueue(
      { task: 'y' },
      { priority: 'urgent', delayMs: 1500, source: 'manual' }
    );
    assert.equal(delayed.priority, 'urgent');
    assert.equal(delayed.source, 'manual');
    assert.equal(delayed.availableAt, 6500);
    assert.equal(send.mock.calls[0].arguments[1].delaySeconds, 2);
  });

  it('dequeues in priority order and respects availability times', async () => {
    const queue = new JobQueue({ now: () => 1000 });
    queue.localQueues.urgent.push({
      id: 'u1',
      payload: 1,
      priority: 'urgent',
      attempts: 0,
      createdAt: 0,
      availableAt: 2000,
    });
    queue.localQueues.normal.push({
      id: 'n1',
      payload: 2,
      priority: 'normal',
      attempts: 0,
      createdAt: 0,
      availableAt: 1000,
    });
    queue.localQueues.low.push({
      id: 'l1',
      payload: 3,
      priority: 'low',
      attempts: 0,
      createdAt: 0,
      availableAt: 1000,
    });

    const first = await queue.dequeue();
    assert.equal(first.id, 'n1');

    queue.localQueues.urgent[0].availableAt = 1000;
    const second = await queue.dequeue();
    assert.equal(second.id, 'u1');

    const third = await queue.dequeue();
    assert.equal(third.id, 'l1');

    const none = await queue.dequeue();
    assert.equal(none, null);
  });

  it('processes jobs and tracks succeeded, failed, and retries', async () => {
    const logger = { warn: mock.fn(), error: mock.fn() };
    const queue = new JobQueue({
      now: () => 0,
      logger,
      retry: { maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 0, jitter: false },
    });

    await queue.enqueue({ key: 'ok' }, { priority: 'normal' });
    await queue.enqueue({ key: 'retry-then-fail' }, { priority: 'normal' });
    queue.localQueues.normal.push({
      id: 'pre-fail',
      payload: { key: 'always-fail-final' },
      priority: 'normal',
      attempts: 1,
      createdAt: 0,
      availableAt: 0,
    });

    const attempts = new Map();
    const summary = await queue.process(async (payload) => {
      const count = (attempts.get(payload.key) || 0) + 1;
      attempts.set(payload.key, count);
      if (payload.key === 'ok') return;
      throw new Error(`boom-${payload.key}-${count}`);
    });

    assert.deepEqual(summary, { processed: 4, succeeded: 1, failed: 2, retries: 1 });
    assert.equal(logger.warn.mock.callCount(), 1);
    assert.equal(logger.error.mock.callCount(), 2);
  });

  it('process uses at least one worker when maxConcurrentWorkers is less than one', async () => {
    const queue = new JobQueue({ maxConcurrentWorkers: 0 });
    const runWorker = mock.method(queue, 'runWorker', async () => {});

    const summary = await queue.process(async () => {});

    assert.equal(runWorker.mock.callCount(), 1);
    assert.deepEqual(summary, { processed: 0, succeeded: 0, failed: 0, retries: 0 });
  });

  it('retryOrFail returns false at max attempts and logs error', async () => {
    const logger = { warn: mock.fn(), error: mock.fn() };
    const queue = new JobQueue({ retry: { maxAttempts: 1 }, logger, now: () => 100 });
    const summary = { retries: 0 };

    const retried = await queue.retryOrFail(
      { id: 'j1', payload: {}, priority: 'normal', attempts: 0, createdAt: 0, availableAt: 0 },
      summary,
      new Error('fatal')
    );

    assert.equal(retried, false);
    assert.equal(summary.retries, 0);
    assert.equal(logger.error.mock.callCount(), 1);
    assert.equal(logger.warn.mock.callCount(), 0);
  });

  it('retryOrFail requeues, warns, and sends delayed job when possible', async () => {
    const send = mock.fn(async () => {});
    const logger = { warn: mock.fn(), error: mock.fn() };
    const queue = new JobQueue({
      queue: { send },
      logger,
      now: () => 1000,
      retry: { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 1000, jitter: false },
    });
    const summary = { retries: 0 };

    const retried = await queue.retryOrFail(
      {
        id: 'j2',
        payload: { x: 1 },
        priority: 'normal',
        attempts: 0,
        createdAt: 0,
        availableAt: 0,
      },
      summary,
      new Error('retryable')
    );

    assert.equal(retried, true);
    assert.equal(summary.retries, 1);
    assert.equal(queue.localQueues.normal.length, 1);
    assert.equal(queue.localQueues.normal[0].attempts, 1);
    assert.equal(queue.localQueues.normal[0].availableAt, 1100);
    assert.equal(logger.warn.mock.callCount(), 1);
    assert.equal(send.mock.callCount(), 1);
    assert.equal(send.mock.calls[0].arguments[1].delaySeconds, 1);
  });

  it('calculateBackoffMs supports jitter and maxDelay cap', () => {
    const jitterQueue = new JobQueue({
      retry: { baseDelayMs: 250, maxDelayMs: 30000, jitter: true },
    });
    mock.method(Math, 'random', () => 0.5);
    assert.equal(jitterQueue.calculateBackoffMs(2), 562);

    const cappedQueue = new JobQueue({
      retry: { baseDelayMs: 10000, maxDelayMs: 30000, jitter: false },
    });
    assert.equal(cappedQueue.calculateBackoffMs(10), 30000);
  });

  it('createId uses crypto.randomUUID and fallback when crypto is unavailable', () => {
    const queue = new JobQueue({ now: () => 42 });
    const uuidMock = mock.method(globalThis.crypto, 'randomUUID', () => 'uuid-fixed');
    assert.equal(queue.createId(), 'uuid-fixed');
    assert.equal(uuidMock.mock.callCount(), 1);

    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    const deleted = Reflect.deleteProperty(globalThis, 'crypto');
    assert.equal(deleted, true);

    mock.method(Math, 'random', () => 0.123456789);
    const fallbackId = queue.createId();
    assert.match(fallbackId, /^job_42_[a-z0-9]{8}$/);

    Object.defineProperty(globalThis, 'crypto', descriptor);
  });
});
