/** Ensure provider usage includes total token count when token fields exist. */
export function normalizeUsage(result) {
  if (!result.usage) return;
  result.usage.total_tokens =
    (result.usage.prompt_tokens ?? 0) + (result.usage.completion_tokens ?? 0);
}

/** Track completion cost and emit budget alerts. */
export async function trackCost({ result, catalogEntry, costTracker, logger }) {
  if (!costTracker || !catalogEntry) return { cost: 0 };

  const costInfo = await costTracker.recordUsage(result, catalogEntry.costPer1kTokens ?? 0);
  if (costInfo.alert) {
    logger.warn(`[AIService] ${costInfo.alert}`);
  }
  return costInfo;
}

/** Convert a provider response into the public AIService chat result. */
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
