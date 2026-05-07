import { MODEL_CATALOG } from '../providers.js';

/** Call a completion provider with a resolved model. */
export async function callProvider(provider, model, params) {
  if (!provider) throw new Error('No AI provider available');
  return provider.complete(model, params);
}

/** Get the fallback provider for a primary provider name. */
export function getFallbackProvider(primaryName, { workersAI, openAI }) {
  if (primaryName === 'workers-ai' && openAI) return openAI;
  if (primaryName === 'openai' && workersAI) return workersAI;
  return null;
}

/** Get the model catalog entry to use with a fallback provider. */
export function getFallbackModel(tier, fallbackProviderName) {
  if (fallbackProviderName === 'workers-ai') return MODEL_CATALOG['workers-fast'];
  if (tier === 'quality') return MODEL_CATALOG['openai-quality'];
  return MODEL_CATALOG['openai-fast'];
}

/** Execute a primary completion request, falling back when configured. */
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
      `[AIService] ${resolved.providerName} failed, falling back to ${fallback.name}: ${primaryError.message}`
    );

    const fallbackModel = getFallbackModel(tier, fallback.name);
    const result = await callProvider(fallback, fallbackModel.model, params);
    return { result, catalogEntry: fallbackModel };
  }
}
