import { buildCompletionMessages } from './message-builder.js';
import { autoRoute, resolveEmbeddingProvider, resolveModel } from './model-selection.js';
import { callProvider, completeWithFallback, getFallbackModel, getFallbackProvider } from './provider-fallback.js';
import { formatChatResult, normalizeUsage, trackCost } from './response-finalizer.js';

export class AIService {
  /**
   * @param {object} options
   * @param {import('../providers.js').WorkersAIProvider} [options.workersAI]
   * @param {import('../providers.js').OpenAIProvider} [options.openAI]
   * @param {import('../prompt-cache.js').PromptCache} [options.cache]
   * @param {import('../cost-tracker.js').CostTracker} [options.costTracker]
   * @param {boolean} [options.enableFallback=true]
   * @param {object} [options.logger=console]
   */
  constructor({ workersAI, openAI, cache, costTracker, enableFallback = true, logger }) {
    this.workersAI = workersAI;
    this.openAI = openAI;
    this.cache = cache;
    this.costTracker = costTracker;
    this.enableFallback = enableFallback;
    this.logger = logger ?? console;
  }

  /** Generate a text completion with automatic model routing. */
  async complete(prompt, options = {}) {
    const {
      tier = 'auto',
      systemPrompt,
      max_tokens = 1024,
      temperature = 0.7,
      skipCache = false,
      model: modelOverride,
    } = options;

    const messages = buildCompletionMessages(prompt, systemPrompt);
    return this.chat(messages, { tier, max_tokens, temperature, skipCache, model: modelOverride });
  }

  /** Chat completion with full message history. */
  async chat(messages, options = {}) {
    const {
      tier = 'auto',
      max_tokens = 1024,
      temperature = 0.7,
      skipCache = false,
      model: modelOverride,
    } = options;

    const resolved = this._resolveModel(tier, messages, modelOverride);
    const cacheParams = { temperature, max_tokens };

    if (this.cache && !skipCache) {
      const cacheKey = await this.cache.getCacheKey(resolved.model, messages, cacheParams);
      const cached = await this.cache.get(cacheKey);
      if (cached) return { ...cached, cached: true, cost: 0 };
    }

    const { result, catalogEntry } = await completeWithFallback({
      resolved,
      tier,
      params: { messages, max_tokens, temperature },
      workersAI: this.workersAI,
      openAI: this.openAI,
      enableFallback: this.enableFallback,
      logger: this.logger,
    });

    normalizeUsage(result);
    const costInfo = await trackCost({
      result,
      catalogEntry,
      costTracker: this.costTracker,
      logger: this.logger,
    });

    if (this.cache && !skipCache) {
      const cacheKey = await this.cache.getCacheKey(resolved.model, messages, cacheParams);
      await this.cache.set(cacheKey, result);
    }

    return formatChatResult(result, costInfo);
  }

  /** Generate embeddings. */
  async embed(text, options = {}) {
    const { provider: providerName = 'workers-ai' } = options;
    const resolved = resolveEmbeddingProvider({
      providerName,
      workersAI: this.workersAI,
      openAI: this.openAI,
    });

    if (!resolved) throw new Error('No AI provider available for embeddings');
    return resolved.provider.embed(resolved.model, text);
  }

  /** @private */
  _resolveModel(tier, messages, modelOverride) {
    return resolveModel({
      tier,
      messages,
      modelOverride,
      workersAI: this.workersAI,
      openAI: this.openAI,
    });
  }

  /** @private */
  _autoRoute(messages) {
    return autoRoute(messages);
  }

  /** @private */
  async _callProvider(provider, model, params) {
    return callProvider(provider, model, params);
  }

  /** @private */
  _getFallbackProvider(primaryName) {
    return getFallbackProvider(primaryName, { workersAI: this.workersAI, openAI: this.openAI });
  }

  /** @private */
  _getFallbackModel(tier, fallbackProviderName) {
    return getFallbackModel(tier, fallbackProviderName);
  }

  /** Get service health and statistics. */
  getStats() {
    return {
      providers: {
        workersAI: !!this.workersAI,
        openAI: !!this.openAI,
      },
      cache: this.cache?.getStats() ?? null,
      costs: this.costTracker?.getSessionStats() ?? null,
    };
  }
}
