import { CostTracker } from '../cost-tracker.js';
import { PromptCache } from '../prompt-cache.js';
import { OpenAIProvider, WorkersAIProvider } from '../providers.js';
import { AIService } from './service.js';

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

  return new AIService({
    workersAI,
    openAI,
    cache,
    costTracker,
    logger: log,
  });
}
