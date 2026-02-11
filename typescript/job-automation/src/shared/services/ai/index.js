/**
 * AI Service — Workers AI + OpenAI via Cloudflare AI Gateway.
 *
 * Provides unified AI inference with:
 * - On-edge Workers AI for fast, free inference
 * - OpenAI via AI Gateway for quality tasks
 * - Automatic model routing (fast/quality/auto)
 * - SHA-256 prompt caching via KV
 * - Cost tracking with budget alerts
 * - Provider fallback on failure
 *
 * @module ai
 * @example
 * ```js
 * import { createAIService } from '../shared/services/ai/index.js';
 *
 * const ai = createAIService(env);
 * const result = await ai.complete('Analyze this job posting', {
 *   tier: 'quality',
 *   systemPrompt: 'You are a job matching assistant.',
 * });
 * ```
 */

export { AIService, createAIService } from './ai-service.js';
export { WorkersAIProvider, OpenAIProvider, MODEL_CATALOG } from './providers.js';
export { PromptCache } from './prompt-cache.js';
export { CostTracker } from './cost-tracker.js';
