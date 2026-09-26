import { MODEL_CATALOG } from '../providers.js';

/**
 * @typedef {import('../providers.js').WorkersAIProvider} WorkersAIProvider
 * @typedef {import('../providers.js').OpenAIProvider} OpenAIProvider
 * @typedef {typeof MODEL_CATALOG[keyof typeof MODEL_CATALOG]} ModelCatalogEntry
 * @typedef {{ role?: string; content?: string }} Message
 *
 * @typedef {{
 *   tier?: 'auto' | 'fast' | 'quality' | string;
 *   messages?: Message[];
 *   modelOverride?: string;
 *   workersAI?: WorkersAIProvider | null;
 *   openAI?: OpenAIProvider | null;
 * }} ResolveModelOptions
 *
 * @typedef {{
 *   provider: WorkersAIProvider | OpenAIProvider | null | undefined;
 *   providerName: string;
 *   model: string;
 *   catalogEntry?: ModelCatalogEntry;
 * }} ResolvedModel
 *
 * @typedef {{
 *   providerName?: string;
 *   workersAI?: WorkersAIProvider | null;
 *   openAI?: OpenAIProvider | null;
 * }} ResolveEmbeddingOptions
 *
 * @typedef {{
 *   provider: WorkersAIProvider | OpenAIProvider;
 *   model: string;
 * }} ResolvedEmbeddingProvider
 */

/** Token threshold for auto-routing: messages above this use quality models. */
const COMPLEXITY_THRESHOLD = 500;

/**
 * Auto-route based on message complexity.
 * @param {Message[]} messages
 * @returns {'quality' | 'fast'}
 */
export function autoRoute(messages) {
  const totalLength = messages.reduce((sum, message) => sum + (message.content?.length ?? 0), 0);
  return totalLength > COMPLEXITY_THRESHOLD ? 'quality' : 'fast';
}

/**
 * Determine model routing based on tier and message complexity.
 * @param {ResolveModelOptions} options
 * @returns {ResolvedModel}
 */
export function resolveModel({ tier, messages, modelOverride, workersAI, openAI }) {
  if (modelOverride) {
    const catalogEntry = Object.values(MODEL_CATALOG).find(
      (entry) => entry.model === modelOverride
    );
    const providerName = catalogEntry?.provider ?? 'openai';
    const provider = providerName === 'workers-ai' ? workersAI : openAI;
    return { provider, providerName, model: modelOverride, catalogEntry };
  }

  const effectiveTier = tier === 'auto' ? autoRoute(/** @type {Message[]} */ (messages)) : tier;

  if (effectiveTier === 'fast') {
    if (workersAI) {
      const entry = MODEL_CATALOG['workers-fast'];
      return {
        provider: workersAI,
        providerName: 'workers-ai',
        model: entry.model,
        catalogEntry: entry,
      };
    }
    const entry = MODEL_CATALOG['openai-fast'];
    return {
      provider: openAI,
      providerName: 'openai',
      model: entry.model,
      catalogEntry: entry,
    };
  }

  if (openAI) {
    const entry = MODEL_CATALOG['openai-quality'];
    return {
      provider: openAI,
      providerName: 'openai',
      model: entry.model,
      catalogEntry: entry,
    };
  }

  const entry = MODEL_CATALOG['workers-fast'];
  return {
    provider: workersAI,
    providerName: 'workers-ai',
    model: entry.model,
    catalogEntry: entry,
  };
}

/**
 * Select a provider for embedding requests.
 * @param {ResolveEmbeddingOptions} options
 * @returns {ResolvedEmbeddingProvider | null}
 */
export function resolveEmbeddingProvider({ providerName, workersAI, openAI }) {
  if (providerName === 'workers-ai' && workersAI) {
    return { provider: workersAI, model: MODEL_CATALOG['workers-embed'].model };
  }
  if (providerName === 'openai' && openAI) {
    return { provider: openAI, model: MODEL_CATALOG['openai-embed'].model };
  }
  if (workersAI) return { provider: workersAI, model: MODEL_CATALOG['workers-embed'].model };
  if (openAI) return { provider: openAI, model: MODEL_CATALOG['openai-embed'].model };
  return null;
}
