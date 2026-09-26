import { CostTracker } from '../cost-tracker.js';
import { PromptCache } from '../prompt-cache.js';
import { OpenAIProvider, WorkersAIProvider } from '../providers.js';
import { AIService } from './service.js';

/**
 * Factory function to create an AIService from Cloudflare Worker env bindings.
 *
 * @param {{ AI?: import('../providers.js').CloudflareAiBinding; OPENAI_API_KEY?: string; AI_GATEWAY_URL?: string; SESSIONS?: import('../prompt-cache.js').PromptCacheKv & import('../cost-tracker.js').CostKvNamespace } | null | undefined} env - Cloudflare Worker environment
 * @param {{ enableCache?: boolean; cacheTtl?: number; budgets?: Partial<import('../cost-tracker.js').BudgetsConfig>; logger?: import('./response-finalizer.js').AppLogger }} [options]
 * @returns {AIService}
 */
export function createAIService(env, options = {}) {
  const { enableCache = true, cacheTtl = 3600, budgets, logger } = options;
  const log = logger ?? console;

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
    log.warn('[AIService] No AI providers configured. AI features will be unavailable.');
  }

  const cache =
    enableCache && env?.SESSIONS
      ? new PromptCache({ kv: env.SESSIONS, ttlSeconds: cacheTtl })
      : null;

  const costTracker = new CostTracker({
    kv: env?.SESSIONS,
    budgets,
  });

  return new AIService(
    /** @type {ConstructorParameters<typeof AIService>[0]} */ ({
      workersAI,
      openAI,
      cache,
      costTracker,
      logger: log,
    })
  );
}
