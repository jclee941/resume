import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { CostTracker } from '../cost-tracker.js';

beforeEach(() => {
  mock.restoreAll();
});

describe('CostTracker', () => {
  it('records usage without kv and computes totals from prompt and completion tokens', async () => {
    const tracker = new CostTracker({ budgets: { dailyLimit: 0.01 } });

    const result = await tracker.recordUsage(
      {
        provider: 'openai',
        model: 'gpt-4o-mini',
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      },
      2
    );

    assert.equal(result.totalTokens, 15);
    assert.equal(result.cost, 0.03);
    assert.equal(result.alert, null);

    const stats = tracker.getSessionStats();
    assert.equal(stats.totalTokens, 15);
    assert.equal(stats.totalCost, 0.03);
    assert.equal(stats.requests, 1);
    assert.equal(stats.byProvider.openai.tokens, 15);
    assert.equal(stats.byProvider.openai.requests, 1);

    stats.totalTokens = 999;
    assert.equal(tracker.getSessionStats().totalTokens, 15);
    assert.equal(await tracker.isBudgetExceeded(), true);
    assert.deepEqual(await tracker.getMonthlyUsage(), tracker.getSessionStats());
  });

  it('records usage with kv persistence and returns budget exceeded alert', async () => {
    const kv = {
      get: mock.fn(async () => null),
      put: mock.fn(async () => undefined),
    };
    const tracker = new CostTracker({
      kv,
      budgets: { dailyLimit: 0.05, monthlyLimit: 10, alertThreshold: 0.8 },
    });

    const result = await tracker.recordUsage(
      {
        provider: 'workers-ai',
        model: '@cf/meta/llama-3.1-8b-instruct',
        usage: { total_tokens: 100 },
      },
      1
    );

    assert.equal(result.totalTokens, 100);
    assert.equal(result.cost, 0.1);
    assert.match(result.alert, /^BUDGET_EXCEEDED: Daily limit/);
    assert.equal(kv.get.mock.callCount(), 2);
    assert.equal(kv.put.mock.callCount(), 2);
    assert.match(kv.get.mock.calls[0].arguments[0], /^ai-cost:daily:/);
    assert.match(kv.get.mock.calls[1].arguments[0], /^ai-cost:monthly:/);
  });

  it('updates existing provider aggregates in session and kv daily data without warnings', async () => {
    const kv = {
      get: mock.fn(async (key) => {
        if (key.startsWith('ai-cost:daily:')) {
          return {
            totalCost: 1,
            totalTokens: 100,
            requests: 1,
            byProvider: {
              openai: { cost: 1, tokens: 100 },
            },
          };
        }
        return {
          totalCost: 1,
          totalTokens: 100,
          requests: 1,
        };
      }),
      put: mock.fn(async () => undefined),
    };
    const tracker = new CostTracker({
      kv,
      budgets: { dailyLimit: 100, monthlyLimit: 1000, alertThreshold: 0.8 },
    });

    await tracker.recordUsage(
      {
        provider: 'openai',
        model: 'gpt-4o-mini',
        usage: { total_tokens: 1000 },
      },
      1
    );
    const result = await tracker.recordUsage(
      {
        provider: 'openai',
        model: 'gpt-4o-mini',
        usage: { total_tokens: 500 },
      },
      1
    );

    assert.equal(result.alert, null);
    assert.equal(tracker.getSessionStats().byProvider.openai.requests, 2);
    assert.equal(kv.put.mock.callCount(), 4);
  });

  it('returns daily warning and monthly warning branches', async () => {
    const kvDailyWarning = {
      get: mock.fn(async (key) => {
        if (key.startsWith('ai-cost:daily:')) {
          return { totalCost: 7.5, totalTokens: 0, requests: 0, byProvider: {} };
        }
        return { totalCost: 1, totalTokens: 0, requests: 0 };
      }),
      put: mock.fn(async () => undefined),
    };
    const trackerDailyWarning = new CostTracker({
      kv: kvDailyWarning,
      budgets: { dailyLimit: 10, monthlyLimit: 100, alertThreshold: 0.8 },
    });

    const dailyWarning = await trackerDailyWarning.recordUsage(
      {
        provider: 'openai',
        model: 'gpt-4o-mini',
        usage: { total_tokens: 1000 },
      },
      1
    );

    assert.match(dailyWarning.alert, /^BUDGET_WARNING: Daily spend/);

    const kvMonthlyWarning = {
      get: mock.fn(async (key) => {
        if (key.startsWith('ai-cost:daily:')) {
          return { totalCost: 1, totalTokens: 0, requests: 0, byProvider: {} };
        }
        return { totalCost: 41, totalTokens: 0, requests: 0 };
      }),
      put: mock.fn(async () => undefined),
    };
    const trackerMonthlyWarning = new CostTracker({
      kv: kvMonthlyWarning,
      budgets: { dailyLimit: 10, monthlyLimit: 50, alertThreshold: 0.8 },
    });

    const monthlyWarning = await trackerMonthlyWarning.recordUsage(
      {
        provider: 'openai',
        model: 'gpt-4o',
        usage: { total_tokens: 1000 },
      },
      1
    );

    assert.match(monthlyWarning.alert, /^BUDGET_WARNING: Monthly spend/);
  });

  it('handles persistence errors, skips persist on zero cost, and reads daily and monthly usage from kv', async () => {
    const logger = { warn: mock.fn() };
    const kvError = {
      get: mock.fn(async () => {
        throw new Error('kv-failure');
      }),
      put: mock.fn(async () => undefined),
    };
    const trackerError = new CostTracker({ kv: kvError, logger });

    const result = await trackerError.recordUsage(
      {
        provider: 'openai',
        model: 'gpt-4o-mini',
        usage: { total_tokens: 100 },
      },
      1
    );

    assert.equal(result.alert, null);
    assert.equal(logger.warn.mock.callCount(), 1);
    assert.match(logger.warn.mock.calls[0].arguments[0], /Persistence error: kv-failure/);

    const kvNoCost = {
      get: mock.fn(async () => null),
      put: mock.fn(async () => undefined),
    };
    const trackerNoCost = new CostTracker({ kv: kvNoCost });
    await trackerNoCost.recordUsage(
      {
        provider: 'workers-ai',
        model: '@cf/meta/llama-3.1-8b-instruct',
        usage: { total_tokens: 10 },
      },
      0
    );
    assert.equal(kvNoCost.get.mock.callCount(), 0);
    assert.equal(kvNoCost.put.mock.callCount(), 0);

    const kvRead = {
      get: mock.fn(async (key) => {
        if (key === 'ai-cost:daily:2026-03-24') {
          return { totalCost: 2, totalTokens: 200, requests: 3 };
        }
        if (key === 'ai-cost:monthly:2026-03') {
          return { totalCost: 5, totalTokens: 500, requests: 6 };
        }
        return null;
      }),
      put: mock.fn(async () => undefined),
    };
    const trackerRead = new CostTracker({ kv: kvRead, budgets: { dailyLimit: 100 } });

    const daily = await trackerRead.getDailyUsage('2026-03-24');
    const monthly = await trackerRead.getMonthlyUsage('2026-03');
    const monthlyNow = await trackerRead.getMonthlyUsage();
    const dailyDefault = await trackerRead.getDailyUsage('2026-03-23');
    const monthlyDefault = await trackerRead.getMonthlyUsage('2026-02');

    assert.deepEqual(daily, { totalCost: 2, totalTokens: 200, requests: 3 });
    assert.deepEqual(monthly, { totalCost: 5, totalTokens: 500, requests: 6 });
    assert.equal(typeof monthlyNow.totalCost, 'number');
    assert.equal(typeof monthlyNow.totalTokens, 'number');
    assert.equal(typeof monthlyNow.requests, 'number');
    assert.deepEqual(dailyDefault, { totalCost: 0, totalTokens: 0, requests: 0 });
    assert.deepEqual(monthlyDefault, { totalCost: 0, totalTokens: 0, requests: 0 });
    assert.equal(await trackerRead.isBudgetExceeded(), false);
  });

  it('falls back to prompt and completion totals when total_tokens is zero', async () => {
    const tracker = new CostTracker();

    const result = await tracker.recordUsage(
      {
        provider: 'openai',
        model: 'gpt-4o-mini',
        usage: { total_tokens: 0, prompt_tokens: 2, completion_tokens: 3 },
      },
      1
    );
    const resultNoUsage = await tracker.recordUsage(
      {
        provider: 'openai',
        model: 'gpt-4o-mini',
      },
      1
    );

    assert.equal(result.totalTokens, 5);
    assert.equal(result.cost, 0.005);
    assert.equal(resultNoUsage.totalTokens, 0);
    assert.equal(resultNoUsage.cost, 0);
  });
});
