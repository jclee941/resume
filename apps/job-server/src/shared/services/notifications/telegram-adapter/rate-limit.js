import { RATE_LIMIT_MAX_PER_MINUTE, RATE_LIMIT_WINDOW_MS } from './constants.js';

/**
 * @typedef {{
 *   rateState: {
 *     windowStartedAt: number;
 *     count: number;
 *   }
 * }} RateLimitedAdapter
 */

/**
 * @param {RateLimitedAdapter} adapter
 * @returns {{ allowed: boolean, resetTime: number, remaining: number }}
 */
export function checkRateLimit(adapter) {
  const now = Date.now();
  if (
    adapter.rateState.windowStartedAt === 0 ||
    now - adapter.rateState.windowStartedAt >= RATE_LIMIT_WINDOW_MS
  ) {
    adapter.rateState.windowStartedAt = now;
    adapter.rateState.count = 0;
  }

  if (adapter.rateState.count >= RATE_LIMIT_MAX_PER_MINUTE) {
    return {
      allowed: false,
      resetTime: adapter.rateState.windowStartedAt + RATE_LIMIT_WINDOW_MS,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    resetTime: adapter.rateState.windowStartedAt + RATE_LIMIT_WINDOW_MS,
    remaining: Math.max(0, RATE_LIMIT_MAX_PER_MINUTE - adapter.rateState.count),
  };
}

/**
 * @param {RateLimitedAdapter} adapter
 * @returns {void}
 */
export function recordMessageSent(adapter) {
  adapter.rateState.count += 1;
}
