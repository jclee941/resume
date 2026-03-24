import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { AIService, createAIService } from '../ai-service.js';
import { MODEL_CATALOG } from '../providers.js';

beforeEach(() => {
  mock.restoreAll();
});

describe('AIService.complete', () => {
  it('builds messages and delegates to chat with mapped options', async () => {
    const service = new AIService({});
    const chatMock = mock.method(service, 'chat', async (messages, options) => ({
      messages,
      options,
    }));

    const result = await service.complete('hello world', {
      tier: 'fast',
      systemPrompt: 'system prompt',
      max_tokens: 200,
      temperature: 0.2,
      skipCache: true,
      model: 'my-model',
    });

    assert.equal(chatMock.mock.callCount(), 1);
    assert.deepEqual(chatMock.mock.calls[0].arguments[0], [
      { role: 'system', content: 'system prompt' },
      { role: 'user', content: 'hello world' },
    ]);
    assert.deepEqual(chatMock.mock.calls[0].arguments[1], {
      tier: 'fast',
      max_tokens: 200,
      temperature: 0.2,
      skipCache: true,
      model: 'my-model',
    });
    assert.deepEqual(result.options, {
      tier: 'fast',
      max_tokens: 200,
      temperature: 0.2,
      skipCache: true,
      model: 'my-model',
    });
  });

  it('delegates without system prompt using default options', async () => {
    const service = new AIService({});
    const chatMock = mock.method(service, 'chat', async (messages, options) => ({
      messages,
      options,
    }));

    const result = await service.complete('only user prompt');

    assert.equal(chatMock.mock.callCount(), 1);
    assert.deepEqual(chatMock.mock.calls[0].arguments[0], [
      { role: 'user', content: 'only user prompt' },
    ]);
    assert.deepEqual(chatMock.mock.calls[0].arguments[1], {
      tier: 'auto',
      max_tokens: 1024,
      temperature: 0.7,
      skipCache: false,
      model: undefined,
    });
    assert.equal(result.messages.length, 1);
  });
});

describe('AIService.chat', () => {
  it('returns cached response when cache hit occurs', async () => {
    const workersAI = { complete: mock.fn(async () => ({ text: 'unused' })) };
    const cache = {
      getCacheKey: mock.fn(async () => 'cache-key'),
      get: mock.fn(async () => ({
        text: 'cached',
        model: 'm',
        provider: 'p',
        usage: { total_tokens: 1 },
      })),
      set: mock.fn(async () => undefined),
      getStats: mock.fn(() => ({ hits: 1, misses: 0, hitRate: 100 })),
    };
    const service = new AIService({ workersAI, cache });

    const result = await service.chat([{ role: 'user', content: 'prompt' }], { tier: 'fast' });

    assert.equal(result.text, 'cached');
    assert.equal(result.cached, true);
    assert.equal(result.cost, 0);
    assert.equal(cache.getCacheKey.mock.callCount(), 1);
    assert.equal(cache.get.mock.callCount(), 1);
    assert.equal(cache.set.mock.callCount(), 0);
    assert.equal(workersAI.complete.mock.callCount(), 0);
  });

  it('calls primary provider, tracks cost, logs alert, and stores cache on miss', async () => {
    const logger = { warn: mock.fn(), error: mock.fn() };
    const workersAI = {
      complete: mock.fn(async () => ({
        text: 'primary-response',
        model: MODEL_CATALOG['workers-fast'].model,
        provider: 'workers-ai',
        latencyMs: 3,
        usage: { prompt_tokens: 2, completion_tokens: 3 },
      })),
    };
    const cache = {
      getCacheKey: mock.fn(async (model) => `cache:${model}`),
      get: mock.fn(async () => null),
      set: mock.fn(async () => undefined),
      getStats: mock.fn(() => ({ hits: 0, misses: 1, hitRate: 0 })),
    };
    const costTracker = {
      recordUsage: mock.fn(async () => ({
        cost: 0.12,
        alert: 'BUDGET_WARNING: Daily spend at 80%',
      })),
      getSessionStats: mock.fn(() => ({
        totalTokens: 5,
        totalCost: 0.12,
        requests: 1,
        byProvider: {},
      })),
    };
    const service = new AIService({ workersAI, cache, costTracker, logger });

    const result = await service.chat([{ role: 'user', content: 'hello' }], {
      tier: 'fast',
      max_tokens: 42,
      temperature: 0.1,
    });

    assert.equal(result.cached, false);
    assert.equal(result.text, 'primary-response');
    assert.equal(result.provider, 'workers-ai');
    assert.equal(result.cost, 0.12);
    assert.equal(result.alert, 'BUDGET_WARNING: Daily spend at 80%');
    assert.equal(result.usage.total_tokens, 5);
    assert.equal(workersAI.complete.mock.callCount(), 1);
    assert.equal(costTracker.recordUsage.mock.callCount(), 1);
    assert.equal(cache.set.mock.callCount(), 1);
    assert.equal(logger.warn.mock.callCount(), 1);
    assert.match(logger.warn.mock.calls[0].arguments[0], /\[AIService\] BUDGET_WARNING/);
  });

  it('falls back to secondary provider when primary fails', async () => {
    const logger = { warn: mock.fn(), error: mock.fn() };
    const workersAI = {
      name: 'workers-ai',
      complete: mock.fn(async () => {
        throw new Error('workers-down');
      }),
    };
    const openAI = {
      name: 'openai',
      complete: mock.fn(async (model) => ({
        text: 'fallback-response',
        model,
        provider: 'openai',
        latencyMs: 7,
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      })),
    };
    const service = new AIService({ workersAI, openAI, logger });

    const result = await service.chat([{ role: 'user', content: 'prompt' }], { tier: 'fast' });

    assert.equal(result.provider, 'openai');
    assert.equal(result.text, 'fallback-response');
    assert.equal(openAI.complete.mock.callCount(), 1);
    assert.equal(openAI.complete.mock.calls[0].arguments[0], MODEL_CATALOG['openai-fast'].model);
    assert.equal(logger.warn.mock.callCount(), 1);
    assert.match(logger.warn.mock.calls[0].arguments[0], /falling back to openai/);
  });

  it('throws when fallback is disabled, missing, or no provider is configured', async () => {
    const workersAI = {
      name: 'workers-ai',
      complete: mock.fn(async () => {
        throw new Error('primary-error');
      }),
    };
    const openAI = {
      name: 'openai',
      complete: mock.fn(async () => ({
        text: 'unused',
        usage: { prompt_tokens: 0, completion_tokens: 0 },
      })),
    };
    const noFallbackService = new AIService({ workersAI, openAI, enableFallback: false });
    await assert.rejects(
      noFallbackService.chat([{ role: 'user', content: 'x' }], { tier: 'fast' }),
      /primary-error/
    );

    const noSecondaryService = new AIService({ workersAI, enableFallback: true });
    await assert.rejects(
      noSecondaryService.chat([{ role: 'user', content: 'x' }], { tier: 'fast' }),
      /primary-error/
    );

    const noProviderService = new AIService({});
    await assert.rejects(
      noProviderService.chat([{ role: 'user', content: 'x' }], { tier: 'fast' }),
      /No AI provider available/
    );
  });

  it('skips cache lookup and cache store when skipCache is true', async () => {
    const workersAI = {
      complete: mock.fn(async () => ({
        text: 'ok',
        model: MODEL_CATALOG['workers-fast'].model,
        provider: 'workers-ai',
        latencyMs: 1,
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      })),
    };
    const cache = {
      getCacheKey: mock.fn(async () => 'k'),
      get: mock.fn(async () => null),
      set: mock.fn(async () => undefined),
      getStats: mock.fn(() => ({ hits: 0, misses: 0, hitRate: 0 })),
    };
    const service = new AIService({ workersAI, cache });

    const result = await service.chat([{ role: 'user', content: 'hello' }], {
      tier: 'fast',
      skipCache: true,
    });

    assert.equal(result.cached, false);
    assert.equal(cache.getCacheKey.mock.callCount(), 0);
    assert.equal(cache.get.mock.callCount(), 0);
    assert.equal(cache.set.mock.callCount(), 0);
  });

  it('returns usage as-is when provider omits usage and skips cost tracker for unknown model override', async () => {
    const openAI = {
      complete: mock.fn(async () => ({
        text: 'no-usage-response',
        model: 'custom-model',
        provider: 'openai',
        latencyMs: 2,
      })),
    };
    const costTracker = {
      recordUsage: mock.fn(async () => ({ cost: 99 })),
      getSessionStats: mock.fn(() => ({
        totalTokens: 0,
        totalCost: 0,
        requests: 0,
        byProvider: {},
      })),
    };
    const service = new AIService({ openAI, costTracker });

    const result = await service.chat([{ role: 'user', content: 'x' }], {
      model: 'custom-model',
      tier: 'auto',
    });

    assert.equal(result.text, 'no-usage-response');
    assert.equal(result.usage, undefined);
    assert.equal(result.cost, 0);
    assert.equal(costTracker.recordUsage.mock.callCount(), 0);
  });

  it('handles nullish usage token fields and nullish cost info values', async () => {
    let callIndex = 0;
    const workersAI = {
      complete: mock.fn(async () => {
        callIndex += 1;
        if (callIndex === 1) {
          return {
            text: 'token-defaults',
            model: 'any-model',
            provider: 'workers-ai',
            usage: { completion_tokens: 4 },
          };
        }
        return {
          text: 'token-defaults-2',
          model: 'any-model',
          provider: 'workers-ai',
          usage: { prompt_tokens: 6 },
        };
      }),
    };
    const costTracker = {
      recordUsage: mock.fn(async () => ({ cost: undefined, alert: undefined })),
      getSessionStats: mock.fn(() => ({
        totalTokens: 0,
        totalCost: 0,
        requests: 0,
        byProvider: {},
      })),
    };
    const service = new AIService({ workersAI, costTracker });
    mock.method(service, '_resolveModel', () => ({
      provider: workersAI,
      providerName: 'workers-ai',
      model: 'any-model',
      catalogEntry: { costPer1kTokens: undefined },
    }));

    const result = await service.chat([{ role: 'user', content: 'x' }]);
    const resultSecond = await service.chat([{ role: 'user', content: 'y' }]);

    assert.equal(result.usage.total_tokens, 4);
    assert.equal(resultSecond.usage.total_tokens, 6);
    assert.equal(result.cost, 0);
    assert.equal(result.alert, null);
    assert.equal(costTracker.recordUsage.mock.callCount(), 2);
    assert.equal(costTracker.recordUsage.mock.calls[0].arguments[1], 0);
  });
});

describe('AIService internals and routing', () => {
  it('resolves model by override, auto route, and tier/provider availability', () => {
    const workersAI = { complete: mock.fn(async () => ({})) };
    const openAI = { complete: mock.fn(async () => ({})) };
    const service = new AIService({ workersAI, openAI });

    const overrideKnown = service._resolveModel(
      'auto',
      [{ role: 'user', content: 'x' }],
      MODEL_CATALOG['workers-fast'].model
    );
    const overrideUnknown = service._resolveModel(
      'auto',
      [{ role: 'user', content: 'x' }],
      'custom-model'
    );
    const autoFast = service._resolveModel('auto', [{ role: 'user', content: 'short' }]);
    const autoQuality = service._resolveModel('auto', [{ role: 'user', content: 'a'.repeat(501) }]);

    assert.equal(overrideKnown.providerName, 'workers-ai');
    assert.equal(overrideKnown.model, MODEL_CATALOG['workers-fast'].model);
    assert.equal(overrideKnown.catalogEntry.provider, 'workers-ai');
    assert.equal(overrideUnknown.providerName, 'openai');
    assert.equal(overrideUnknown.model, 'custom-model');
    assert.equal(overrideUnknown.catalogEntry, undefined);
    assert.equal(autoFast.providerName, 'workers-ai');
    assert.equal(autoFast.model, MODEL_CATALOG['workers-fast'].model);
    assert.equal(autoQuality.providerName, 'openai');
    assert.equal(autoQuality.model, MODEL_CATALOG['openai-quality'].model);

    const openAiOnly = new AIService({ openAI });
    const fastWithOpenAiOnly = openAiOnly._resolveModel('fast', [{ role: 'user', content: 'x' }]);
    assert.equal(fastWithOpenAiOnly.providerName, 'openai');
    assert.equal(fastWithOpenAiOnly.model, MODEL_CATALOG['openai-fast'].model);

    const workersOnly = new AIService({ workersAI });
    const qualityWithWorkersOnly = workersOnly._resolveModel('quality', [
      { role: 'user', content: 'x' },
    ]);
    assert.equal(qualityWithWorkersOnly.providerName, 'workers-ai');
    assert.equal(qualityWithWorkersOnly.model, MODEL_CATALOG['workers-fast'].model);
  });

  it('routes complexity threshold and checks fallback provider/model helpers', async () => {
    const workersAI = {
      name: 'workers-ai',
      complete: mock.fn(async () => ({
        text: 'ok',
        usage: { prompt_tokens: 0, completion_tokens: 0 },
      })),
    };
    const openAI = {
      name: 'openai',
      complete: mock.fn(async () => ({
        text: 'ok',
        usage: { prompt_tokens: 0, completion_tokens: 0 },
      })),
    };
    const service = new AIService({ workersAI, openAI });

    assert.equal(service._autoRoute([{ role: 'user', content: 'a'.repeat(500) }]), 'fast');
    assert.equal(service._autoRoute([{ role: 'user', content: 'a'.repeat(501) }]), 'quality');
    assert.equal(service._autoRoute([{ role: 'user' }]), 'fast');
    assert.equal(service._getFallbackProvider('workers-ai'), openAI);
    assert.equal(service._getFallbackProvider('openai'), workersAI);
    assert.equal(service._getFallbackProvider('other'), null);
    assert.equal(service._getFallbackModel('quality', 'workers-ai'), MODEL_CATALOG['workers-fast']);
    assert.equal(service._getFallbackModel('quality', 'openai'), MODEL_CATALOG['openai-quality']);
    assert.equal(service._getFallbackModel('fast', 'openai'), MODEL_CATALOG['openai-fast']);

    await assert.rejects(service._callProvider(null, 'model', {}), /No AI provider available/);
    const ok = await service._callProvider(workersAI, 'my-model', { messages: [] });
    assert.equal(ok.text, 'ok');
    assert.equal(workersAI.complete.mock.calls[0].arguments[0], 'my-model');
  });
});

describe('AIService.embed and getStats', () => {
  it('selects embedding provider by option and fallback rules and throws when none exist', async () => {
    const workersAI = {
      embed: mock.fn(async () => ({
        embeddings: [[1]],
        model: 'workers-embed-model',
        provider: 'workers-ai',
      })),
    };
    const openAI = {
      embed: mock.fn(async () => ({
        embeddings: [[2]],
        model: 'openai-embed-model',
        provider: 'openai',
      })),
    };
    const service = new AIService({ workersAI, openAI });

    const defaultEmbed = await service.embed('text');
    const explicitOpenAi = await service.embed('text', { provider: 'openai' });

    assert.equal(defaultEmbed.provider, 'workers-ai');
    assert.equal(explicitOpenAi.provider, 'openai');
    assert.equal(workersAI.embed.mock.calls[0].arguments[0], MODEL_CATALOG['workers-embed'].model);
    assert.equal(openAI.embed.mock.calls[0].arguments[0], MODEL_CATALOG['openai-embed'].model);

    const workersOnly = new AIService({ workersAI });
    const fallbackToWorkers = await workersOnly.embed('text', { provider: 'openai' });
    assert.equal(fallbackToWorkers.provider, 'workers-ai');

    const openAiOnly = new AIService({ openAI });
    const fallbackToOpenAi = await openAiOnly.embed('text', { provider: 'workers-ai' });
    assert.equal(fallbackToOpenAi.provider, 'openai');

    const none = new AIService({});
    await assert.rejects(none.embed('text'), /No AI provider available for embeddings/);
  });

  it('returns provider, cache, and cost stats', () => {
    const cache = {
      getStats: mock.fn(() => ({ hits: 2, misses: 1, hitRate: 67 })),
    };
    const costTracker = {
      getSessionStats: mock.fn(() => ({
        totalTokens: 10,
        totalCost: 0.5,
        requests: 3,
        byProvider: {},
      })),
    };
    const service = new AIService({ workersAI: {}, openAI: {}, cache, costTracker });
    const emptyService = new AIService({});

    const stats = service.getStats();
    const emptyStats = emptyService.getStats();

    assert.deepEqual(stats, {
      providers: { workersAI: true, openAI: true },
      cache: { hits: 2, misses: 1, hitRate: 67 },
      costs: { totalTokens: 10, totalCost: 0.5, requests: 3, byProvider: {} },
    });
    assert.deepEqual(emptyStats, {
      providers: { workersAI: false, openAI: false },
      cache: null,
      costs: null,
    });
  });
});

describe('createAIService', () => {
  it('creates service for different environment combinations', () => {
    const warnLogger = { warn: mock.fn(), error: mock.fn() };

    const none = createAIService({}, { logger: warnLogger, enableCache: true });
    assert.equal(none.workersAI, null);
    assert.equal(none.openAI, null);
    assert.equal(none.cache, null);
    assert.ok(none.costTracker);
    assert.equal(warnLogger.warn.mock.callCount(), 1);

    const envFull = {
      AI: { run: async () => ({}) },
      OPENAI_API_KEY: 'key',
      AI_GATEWAY_URL: 'https://gw/',
      SESSIONS: {
        get: async () => null,
        put: async () => undefined,
        delete: async () => undefined,
      },
    };

    const full = createAIService(envFull, {
      enableCache: true,
      cacheTtl: 999,
      budgets: { dailyLimit: 3 },
      logger: warnLogger,
    });

    assert.ok(full.workersAI);
    assert.ok(full.openAI);
    assert.ok(full.cache);
    assert.ok(full.costTracker);
    assert.equal(full.cache.ttlSeconds, 999);
    assert.equal(full.costTracker.budgets.dailyLimit, 3);

    const noCache = createAIService(envFull, { enableCache: false, logger: warnLogger });
    assert.equal(noCache.cache, null);

    const withDefaultLogger = createAIService({}, {});
    assert.equal(withDefaultLogger.cache, null);
  });
});
