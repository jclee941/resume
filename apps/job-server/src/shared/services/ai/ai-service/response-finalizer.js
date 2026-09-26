/**
 * @typedef {{
 *   prompt_tokens?: number;
 *   completion_tokens?: number;
 *   total_tokens?: number;
 *   [key: string]: unknown;
 * }} ProviderUsage
 *
 * @typedef {{
 *   text: string;
 *   model: string;
 *   provider: string;
 *   latencyMs?: number;
 *   usage?: ProviderUsage;
 *   [key: string]: unknown;
 * }} ProviderResult
 *
 * @typedef {{
 *   costPer1kTokens?: number;
 *   [key: string]: unknown;
 * }} ModelCatalogEntry
 *
 * @typedef {{
 *   cost?: number;
 *   alert?: string | null;
 *   [key: string]: unknown;
 * }} CostInfo
 *
 * @typedef {{
 *   recordUsage(result: unknown, costPer1kTokens: number): Promise<CostInfo>;
 * }} CostTracker
 *
 * @typedef {{
 *   warn(message: string): void;
 *   [key: string]: unknown;
 * }} AppLogger
 */

/**
 * Ensure provider usage includes total token count when token fields exist.
 * @param {{ usage?: ProviderUsage }} result
 */
export function normalizeUsage(result) {
  if (!result.usage) return;
  result.usage.total_tokens =
    (result.usage.prompt_tokens ?? 0) + (result.usage.completion_tokens ?? 0);
}

/**
 * Track completion cost and emit budget alerts.
 * @param {{
 *   result: ProviderResult;
 *   catalogEntry?: ModelCatalogEntry | null;
 *   costTracker?: CostTracker | null;
 *   logger: AppLogger;
 * }} options
 * @returns {Promise<CostInfo>}
 */
export async function trackCost({ result, catalogEntry, costTracker, logger }) {
  if (!costTracker || !catalogEntry) return { cost: 0 };

  const costInfo = await costTracker.recordUsage(result, catalogEntry.costPer1kTokens ?? 0);
  if (costInfo.alert) {
    logger.warn(`[AIService] ${costInfo.alert}`);
  }
  return costInfo;
}

/**
 * Convert a provider response into the public AIService chat result.
 * @param {ProviderResult} result
 * @param {CostInfo} costInfo
 */
export function formatChatResult(result, costInfo) {
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
