import { MODEL_CATALOG } from '../providers.js';

/**
 * @typedef {{
 *   complete(model: string, params?: unknown): Promise<unknown>;
 *   name?: string;
 * }} AnyAIProvider
 *
 * @typedef {typeof MODEL_CATALOG[keyof typeof MODEL_CATALOG]} CatalogEntry
 *
 * @typedef {{
 *   provider: AnyAIProvider | null | undefined;
 *   providerName: string;
 *   model: string;
 *   catalogEntry?: CatalogEntry;
 * }} ResolvedModel
 */

/**
 * Call a completion provider with a resolved model.
 * @param {AnyAIProvider | null | undefined} provider
 * @param {string} model
 * @param {unknown} [params]
 * @returns {Promise<unknown>}
 */
export async function callProvider(provider, model, params) {
  if (!provider) throw new Error('No AI provider available');
  return provider.complete(model, params);
}

/**
 * Get the fallback provider for a primary provider name.
 * @param {string} primaryName
 * @param {{ workersAI?: AnyAIProvider | null; openAI?: AnyAIProvider | null }} providers
 * @returns {AnyAIProvider | null}
 */
export function getFallbackProvider(primaryName, { workersAI, openAI }) {
  if (primaryName === 'workers-ai' && openAI) return openAI;
  if (primaryName === 'openai' && workersAI) return workersAI;
  return null;
}

/**
 * Get the model catalog entry to use with a fallback provider.
 * @param {string} [tier]
 * @param {string} [fallbackProviderName]
 * @returns {CatalogEntry}
 */
export function getFallbackModel(tier, fallbackProviderName) {
  if (fallbackProviderName === 'workers-ai') return MODEL_CATALOG['workers-fast'];
  if (tier === 'quality') return MODEL_CATALOG['openai-quality'];
  return MODEL_CATALOG['openai-fast'];
}

/**
 * Execute a primary completion request, falling back when configured.
 * @param {{
 *   resolved: ResolvedModel;
 *   tier?: string;
 *   params?: unknown;
 *   workersAI?: AnyAIProvider | null;
 *   openAI?: AnyAIProvider | null;
 *   enableFallback?: boolean;
 *   logger: { warn(message: string, ...args: unknown[]): void };
 * }} options
 * @returns {Promise<{ result: unknown; catalogEntry?: CatalogEntry }>}
 */
export async function completeWithFallback({
  resolved,
  tier,
  params,
  workersAI,
  openAI,
  enableFallback,
  logger,
}) {
  try {
    const result = await callProvider(resolved.provider, resolved.model, params);
    return { result, catalogEntry: resolved.catalogEntry };
  } catch (primaryError) {
    if (!enableFallback) throw primaryError;

    const fallback = getFallbackProvider(resolved.providerName, { workersAI, openAI });
    if (!fallback) throw primaryError;

    logger.warn(
      `[AIService] ${resolved.providerName} failed, falling back to ${fallback.name}: ${primaryError instanceof Error ? primaryError.message : String(primaryError)}`
    );

    const fallbackModel = getFallbackModel(tier, fallback.name);
    const result = await callProvider(fallback, fallbackModel.model, params);
    return { result, catalogEntry: fallbackModel };
  }
}
