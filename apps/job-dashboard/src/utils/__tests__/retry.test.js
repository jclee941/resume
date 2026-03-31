import test from 'node:test';
import assert from 'node:assert/strict';

import { isRetryableError, parseRetryAfter, withRetry } from '../retry.js';

function createSetTimeoutSpy() {
  const originalSetTimeout = globalThis.setTimeout;
  const delays = [];

  globalThis.setTimeout = (callback, delay, ...args) => {
    delays.push(delay);
    callback(...args);
    return 0;
  };

  return {
    delays,
    restore() {
      globalThis.setTimeout = originalSetTimeout;
    },
  };
}

test('parseRetryAfter extracts Telegram retry_after seconds', () => {
  const error = {
    response: {
      status: 429,
      data: {
        parameters: {
          retry_after: 7,
        },
      },
    },
  };

  assert.equal(parseRetryAfter(error), 7);
});

test('parseRetryAfter returns null when no retry_after exists', () => {
  const error = {
    response: {
      status: 429,
      data: {
        description: 'Too Many Requests',
      },
    },
  };

  assert.equal(parseRetryAfter(error), null);
});

test('isRetryableError classifies network and HTTP errors', () => {
  assert.equal(isRetryableError({ code: 'ETIMEDOUT' }), true);
  assert.equal(isRetryableError({ code: 'ECONNRESET' }), true);
  assert.equal(isRetryableError({ response: { status: 429 } }), true);
  assert.equal(isRetryableError({ response: { status: 503 } }), true);

  assert.equal(isRetryableError({ response: { status: 400 } }), false);
  assert.equal(isRetryableError({ response: { status: 401 } }), false);
  assert.equal(isRetryableError({ response: { status: 403 } }), false);
  assert.equal(isRetryableError({ response: { status: 404 } }), false);
});

test('withRetry retries and eventually succeeds with exponential delays', async () => {
  const timeoutSpy = createSetTimeoutSpy();
  const originalRandom = Math.random;
  Math.random = () => 0;

  let callCount = 0;
  const result = await withRetry(
    async () => {
      callCount += 1;
      if (callCount < 3) {
        const error = new Error('temporary timeout');
        error.code = 'ETIMEDOUT';
        throw error;
      }
      return 'ok';
    },
    {
      maxRetries: 4,
      baseDelay: 1000,
      maxDelay: 30000,
    }
  );

  Math.random = originalRandom;
  timeoutSpy.restore();

  assert.equal(result, 'ok');
  assert.equal(callCount, 3);
  assert.deepEqual(timeoutSpy.delays, [1000, 2000]);
});

test('withRetry keeps jitter in 0-1000ms range', async () => {
  const timeoutSpyMin = createSetTimeoutSpy();
  const originalRandom = Math.random;

  Math.random = () => 0;
  let minCalls = 0;
  await withRetry(
    async () => {
      minCalls += 1;
      if (minCalls === 1) {
        const error = new Error('conn reset');
        error.code = 'ECONNRESET';
        throw error;
      }
      return 'ok';
    },
    { maxRetries: 1, baseDelay: 1000 }
  );

  timeoutSpyMin.restore();

  const timeoutSpyMax = createSetTimeoutSpy();
  Math.random = () => 0.999;
  let maxCalls = 0;
  await withRetry(
    async () => {
      maxCalls += 1;
      if (maxCalls === 1) {
        const error = new Error('conn reset');
        error.code = 'ECONNRESET';
        throw error;
      }
      return 'ok';
    },
    { maxRetries: 1, baseDelay: 1000 }
  );

  Math.random = originalRandom;
  timeoutSpyMax.restore();

  assert.equal(timeoutSpyMin.delays[0], 1000);
  assert.ok(timeoutSpyMax.delays[0] >= 1999);
  assert.ok(timeoutSpyMax.delays[0] <= 2000);
});

test('withRetry respects Telegram retry_after for 429 responses', async () => {
  const timeoutSpy = createSetTimeoutSpy();
  const originalRandom = Math.random;
  Math.random = () => 0;

  let callCount = 0;
  await withRetry(
    async () => {
      callCount += 1;
      if (callCount === 1) {
        const error = new Error('rate limited');
        error.response = {
          status: 429,
          data: {
            parameters: {
              retry_after: 3,
            },
          },
        };
        throw error;
      }
      return 'ok';
    },
    {
      maxRetries: 2,
      baseDelay: 1000,
    }
  );

  Math.random = originalRandom;
  timeoutSpy.restore();

  assert.deepEqual(timeoutSpy.delays, [3000]);
});

test('withRetry caps delay and rethrows original error after max retries', async () => {
  const timeoutSpy = createSetTimeoutSpy();
  const originalRandom = Math.random;
  Math.random = () => 0;

  const terminalError = new Error('service unavailable');
  terminalError.response = { status: 503 };

  let callCount = 0;

  await assert.rejects(
    withRetry(
      async () => {
        callCount += 1;
        throw terminalError;
      },
      {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 1500,
      }
    ),
    (error) => error === terminalError
  );

  Math.random = originalRandom;
  timeoutSpy.restore();

  assert.equal(callCount, 4);
  assert.deepEqual(timeoutSpy.delays, [1000, 1500, 1500]);
});

test('withRetry does not retry non-retryable errors', async () => {
  const timeoutSpy = createSetTimeoutSpy();

  const badRequestError = new Error('bad request');
  badRequestError.response = { status: 400 };

  let callCount = 0;
  await assert.rejects(
    withRetry(
      async () => {
        callCount += 1;
        throw badRequestError;
      },
      { maxRetries: 4 }
    ),
    (error) => error === badRequestError
  );

  timeoutSpy.restore();

  assert.equal(callCount, 1);
  assert.equal(timeoutSpy.delays.length, 0);
});
