import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  AuthError,
  CircuitOpenError,
  NetworkError,
  RateLimitError,
} from '../../errors/apply-errors.js';
import { getRetryMetrics, resetRetryState, withRetry } from '../retry.js';

describe('withRetry', () => {
  beforeEach(() => {
    resetRetryState();
  });

  it('retries retryable network errors and succeeds', async () => {
    let attempt = 0;
    const sleepCalls = [];

    const result = await withRetry(
      async () => {
        attempt += 1;
        if (attempt < 3) {
          throw new NetworkError('network timeout', { platform: 'wanted' });
        }
        return { ok: true };
      },
      {
        platform: 'wanted',
        maxRetries: 3,
        baseDelay: 100,
        maxDelay: 10000,
        random: () => 0,
        sleep: async (ms) => {
          sleepCalls.push(ms);
        },
      }
    );

    assert.deepEqual(result, { ok: true });
    assert.equal(attempt, 3);
    assert.deepEqual(sleepCalls, [100, 200]);

    const metrics = getRetryMetrics('wanted');
    assert.equal(metrics.executions, 1);
    assert.equal(metrics.successes, 1);
    assert.equal(metrics.failures, 0);
    assert.equal(metrics.retryAttempts, 2);
    assert.equal(metrics.successAfterRetry, 1);
  });

  it('fails fast on authentication errors without retry', async () => {
    let attempt = 0;
    const sleepCalls = [];

    await assert.rejects(
      withRetry(
        async () => {
          attempt += 1;
          throw new AuthError('session expired', { platform: 'wanted' });
        },
        {
          platform: 'wanted',
          maxRetries: 5,
          sleep: async (ms) => {
            sleepCalls.push(ms);
          },
        }
      ),
      (error) => {
        assert.ok(error instanceof AuthError);
        return true;
      }
    );

    assert.equal(attempt, 1);
    assert.deepEqual(sleepCalls, []);

    const metrics = getRetryMetrics('wanted');
    assert.equal(metrics.executions, 1);
    assert.equal(metrics.failures, 1);
    assert.equal(metrics.retryAttempts, 0);
  });

  it('uses longer delay for rate-limit errors', async () => {
    let attempt = 0;
    const sleepCalls = [];

    await withRetry(
      async () => {
        attempt += 1;
        if (attempt === 1) {
          throw new RateLimitError('slow down', {
            platform: 'saramin',
            retryAfterMs: 5000,
          });
        }

        return { ok: true };
      },
      {
        platform: 'saramin',
        maxRetries: 2,
        baseDelay: 100,
        random: () => 0,
        sleep: async (ms) => {
          sleepCalls.push(ms);
        },
      }
    );

    assert.equal(attempt, 2);
    assert.deepEqual(sleepCalls, [5000]);
  });

  it('opens circuit after threshold failures and closes after cooldown', async () => {
    let currentTime = 1_000;

    const runFailingCall = () =>
      withRetry(
        async () => {
          throw new NetworkError('network down', { platform: 'jobkorea' });
        },
        {
          platform: 'jobkorea',
          maxRetries: 0,
          now: () => currentTime,
          sleep: async () => {},
        }
      );

    await assert.rejects(runFailingCall());
    await assert.rejects(runFailingCall());
    await assert.rejects(runFailingCall());

    await assert.rejects(
      withRetry(async () => ({ ok: true }), {
        platform: 'jobkorea',
        now: () => currentTime,
        sleep: async () => {},
      }),
      (error) => {
        assert.ok(error instanceof CircuitOpenError);
        return true;
      }
    );

    currentTime += 5 * 60 * 1000 + 1;
    const result = await withRetry(async () => ({ ok: true }), {
      platform: 'jobkorea',
      now: () => currentTime,
      sleep: async () => {},
    });

    assert.deepEqual(result, { ok: true });
  });
});
