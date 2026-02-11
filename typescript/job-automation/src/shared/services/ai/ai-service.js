/**
 * Unified AI Service — main facade for all AI operations.
 *
 * Features:
 * - Model routing: fast (Workers AI) vs quality (OpenAI) vs auto (complexity heuristic)
 * - Prompt caching: SHA-256 deduplication via KV
 * - Cost tracking: token counting, budget alerts
 * - Provider fallback: Workers AI -> OpenAI on failure
 *
 * @module ai/ai-service
 * @example
 * ```js
 * const aiService = createAIService(env);
 * const result = await aiService.complete('Summarize this job posting', {
 *   tier: 'auto',
 *   systemPrompt: 'You are a job analysis assistant.',
 * });
 * console.log(result.text);
 * ```
 */

import { WorkersAIProvider, OpenAIProvider, MODEL_CATALOG } from './providers.js';
import { PromptCache } from './prompt-cache.js';
import { CostTracker } from './cost-tracker.js';

/** Token threshold for auto-routing: messages above this use quality models */
const COMPLEXITY_THRESHOLD = 500;

export class AIService {
  /**
   * @param {object} options
   * @param {WorkersAIProvider} [options.workersAI] - Workers AI provider
   * @param {OpenAIProvider} [options.openAI] - OpenAI provider
   * @param {PromptCache} [options.cache] - Prompt cache
   * @param {CostTracker} [options.costTracker] - Cost tracker
   * @param {boolean} [options.enableFallback=true] - Auto-fallback on provider failure
   */
  constructor({ workersAI, openAI, cache, costTracker, enableFallback = true }) {
    this.workersAI = workersAI;
    this.openAI = openAI;
    this.cache = cache;
    this.costTracker = costTracker;
    this.enableFallback = enableFallback;
  }

  /**
   * Generate a text completion with automatic model routing.
   *
   * @param {string} prompt - User prompt text
   * @param {object} [options]
   * @param {'fast'|'quality'|'auto'} [options.tier='auto'] - Model tier selection
   * @param {string} [options.systemPrompt] - System prompt
   * @param {number} [options.max_tokens=1024] - Max tokens
   * @param {number} [options.temperature=0.7] - Temperature
   * @param {boolean} [options.skipCache=false] - Skip cache lookup
   * @param {string} [options.model] - Override model selection
   * @returns {Promise<{text: string, model: string, provider: string, cached: boolean, usage: object, cost: number}>}
   */
  async complete(prompt, options = {}) {
    const {
      tier = 'auto',
      systemPrompt,
      max_tokens = 1024,
      temperature = 0.7,
      skipCache = false,
      model: modelOverride,
    } = options;

    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    return this.chat(messages, { tier, max_tokens, temperature, skipCache, model: modelOverride });
  }

  /**
   * Chat completion with full message history.
   *
   * @param {Array<{role: string, content: string}>} messages - Chat messages
   * @param {object} [options]
   * @param {'fast'|'quality'|'auto'} [options.tier='auto'] - Model tier
   * @param {number} [options.max_tokens=1024]
   * @param {number} [options.temperature=0.7]
   * @param {boolean} [options.skipCache=false]
   * @param {string} [options.model] - Override model
   * @returns {Promise<object>}
   */
  async chat(messages, options = {}) {
    const {
      tier = 'auto',
      max_tokens = 1024,
      temperature = 0.7,
      skipCache = false,
      model: modelOverride,
    } = options;

    const resolved = this._resolveModel(tier, messages, modelOverride);

    if (this.cache && !skipCache) {
      const cacheKey = await this.cache.getCacheKey(resolved.model, messages, {
        temperature,
        max_tokens,
      });
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { ...cached, cached: true, cost: 0 };
      }
    }

    let result;
    let usedCatalogEntry = resolved.catalogEntry;

    try {
      result = await this._callProvider(resolved.provider, resolved.model, {
        messages,
        max_tokens,
        temperature,
      });
    } catch (primaryError) {
      if (!this.enableFallback) throw primaryError;

      const fallback = this._getFallbackProvider(resolved.providerName);
      if (!fallback) throw primaryError;

      console.warn(
        `[AIService] ${resolved.providerName} failed, falling back to ${fallback.name}: ${primaryError.message}`
      );

      const fallbackModel = this._getFallbackModel(tier, fallback.name);
      result = await this._callProvider(fallback, fallbackModel.model, {
        messages,
        max_tokens,
        temperature,
      });
      usedCatalogEntry = fallbackModel;
    }

    if (result.usage) {
      result.usage.total_tokens =
        (result.usage.prompt_tokens ?? 0) + (result.usage.completion_tokens ?? 0);
    }

    let costInfo = { cost: 0 };
    if (this.costTracker && usedCatalogEntry) {
      costInfo = await this.costTracker.recordUsage(result, usedCatalogEntry.costPer1kTokens ?? 0);
      if (costInfo.alert) {
        console.warn(`[AIService] ${costInfo.alert}`);
      }
    }

    if (this.cache && !skipCache) {
      const cacheKey = await this.cache.getCacheKey(resolved.model, messages, {
        temperature,
        max_tokens,
      });
      await this.cache.set(cacheKey, result);
    }

    return {
      text: result.text,
      model: result.model,
      provider: result.provider,
      cached: false,
      latencyMs: result.latencyMs,
      usage: result.usage,
      cost: costInfo.cost ?? 0,
      alert: costInfo.alert ?? null,
    };
  }

  /**
   * Generate embeddings.
   * @param {string|string[]} text - Text to embed
   * @param {object} [options]
   * @param {'workers-ai'|'openai'} [options.provider='workers-ai']
   * @returns {Promise<{embeddings: number[][], model: string, provider: string}>}
   */
  async embed(text, options = {}) {
    const { provider: providerName = 'workers-ai' } = options;

    if (providerName === 'workers-ai' && this.workersAI) {
      return this.workersAI.embed(MODEL_CATALOG['workers-embed'].model, text);
    }
    if (providerName === 'openai' && this.openAI) {
      return this.openAI.embed(MODEL_CATALOG['openai-embed'].model, text);
    }

    if (this.workersAI) {
      return this.workersAI.embed(MODEL_CATALOG['workers-embed'].model, text);
    }
    if (this.openAI) {
      return this.openAI.embed(MODEL_CATALOG['openai-embed'].model, text);
    }

    throw new Error('No AI provider available for embeddings');
  }

  /**
   * Determine model routing based on tier and message complexity.
   * @private
   */
  _resolveModel(tier, messages, modelOverride) {
    if (modelOverride) {
      const catalogEntry = Object.values(MODEL_CATALOG).find((e) => e.model === modelOverride);
      const providerName = catalogEntry?.provider ?? 'openai';
      const provider = providerName === 'workers-ai' ? this.workersAI : this.openAI;
      return { provider, providerName, model: modelOverride, catalogEntry };
    }

    const effectiveTier = tier === 'auto' ? this._autoRoute(messages) : tier;

    if (effectiveTier === 'fast') {
      if (this.workersAI) {
        const entry = MODEL_CATALOG['workers-fast'];
        return {
          provider: this.workersAI,
          providerName: 'workers-ai',
          model: entry.model,
          catalogEntry: entry,
        };
      }
      const entry = MODEL_CATALOG['openai-fast'];
      return {
        provider: this.openAI,
        providerName: 'openai',
        model: entry.model,
        catalogEntry: entry,
      };
    }

    if (this.openAI) {
      const entry = MODEL_CATALOG['openai-quality'];
      return {
        provider: this.openAI,
        providerName: 'openai',
        model: entry.model,
        catalogEntry: entry,
      };
    }
    const entry = MODEL_CATALOG['workers-fast'];
    return {
      provider: this.workersAI,
      providerName: 'workers-ai',
      model: entry.model,
      catalogEntry: entry,
    };
  }

  /**
   * Auto-route based on message complexity.
   * Short messages → fast, long/complex → quality.
   * @private
   */
  _autoRoute(messages) {
    const totalLength = messages.reduce((sum, m) => sum + (m.content?.length ?? 0), 0);
    return totalLength > COMPLEXITY_THRESHOLD ? 'quality' : 'fast';
  }

  /** @private */
  async _callProvider(provider, model, params) {
    if (!provider) throw new Error('No AI provider available');
    return provider.complete(model, params);
  }

  /** @private */
  _getFallbackProvider(primaryName) {
    if (primaryName === 'workers-ai' && this.openAI) return this.openAI;
    if (primaryName === 'openai' && this.workersAI) return this.workersAI;
    return null;
  }

  /** @private */
  _getFallbackModel(tier, fallbackProviderName) {
    if (fallbackProviderName === 'workers-ai') return MODEL_CATALOG['workers-fast'];
    if (tier === 'quality') return MODEL_CATALOG['openai-quality'];
    return MODEL_CATALOG['openai-fast'];
  }

  /**
   * Get service health and statistics.
   * @returns {object}
   */
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

/**
 * Factory function to create an AIService from Cloudflare Worker env bindings.
 *
 * @param {object} env - Cloudflare Worker environment
 * @param {object} [options]
 * @param {boolean} [options.enableCache=true]
 * @param {number} [options.cacheTtl=3600]
 * @param {object} [options.budgets]
 * @returns {AIService}
 */
export function createAIService(env, options = {}) {
  const { enableCache = true, cacheTtl = 3600, budgets } = options;

  let workersAI = null;
  let openAI = null;

  if (env?.AI) {
    workersAI = new WorkersAIProvider(env);
  }

  if (env?.OPENAI_API_KEY && env?.AI_GATEWAY_URL) {
    openAI = new OpenAIProvider({
      apiKey: env.OPENAI_API_KEY,
      gatewayUrl: env.AI_GATEWAY_URL,
    });
  }

  if (!workersAI && !openAI) {
    console.warn('[AIService] No AI providers configured. AI features will be unavailable.');
  }

  const cache =
    enableCache && env?.SESSIONS
      ? new PromptCache({ kv: env.SESSIONS, ttlSeconds: cacheTtl })
      : null;

  const costTracker = new CostTracker({
    kv: env?.SESSIONS,
    budgets,
  });

  return new AIService({
    workersAI,
    openAI,
    cache,
    costTracker,
  });
}
