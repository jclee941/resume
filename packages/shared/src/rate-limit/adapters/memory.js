/**
 * In-memory adapter for rate-limit primitives.
 *
 * SSOT-035 / issue #44 Phase 2 step 2 — wraps the canonical algorithm
 * classes (`TokenBucket`, `SlidingWindow`) with a per-key Map so a single
 * Node process can cap distinct callers (per-platform, per-user, per-IP)
 * without any out-of-process I/O.
 *
 * Used by `apps/job-server` for the in-process crawl orchestrator. For
 * Worker-edge HTTP middleware see `./kv.js`.
 *
 * Each key is independent. The factory functions return objects with the
 * same `tryConsume` / `tryRecord` / `retryAfterMs` API as the underlying
 * class so callers do not branch on the adapter at the call site.
 */

import { TokenBucket } from '../token-bucket.js';
import { SlidingWindow } from '../sliding-window.js';

/**
 * Build a per-key TokenBucket store backed by an in-process Map.
 *
 * @param {object} options
 * @param {number} options.capacity
 * @param {number} options.refillRatePerSecond
 * @param {() => number} [options.now]
 * @returns {{
 *   tryConsume: (key: string, count?: number) => boolean,
 *   peek: (key: string) => { tokens: number, capacity: number },
 *   reset: (key: string) => void,
 *   clear: () => void,
 * }}
 */
export function createMemoryTokenBuckets({
  capacity,
  refillRatePerSecond,
  now = () => Date.now(),
}) {
  const buckets = new Map();

  /** @param {string} key */
  function getBucket(key) {
    let b = buckets.get(key);
    if (!b) {
      b = new TokenBucket({ capacity, refillRatePerSecond, now });
      buckets.set(key, b);
    }
    return b;
  }

  return {
    tryConsume(key, count = 1) {
      return getBucket(key).tryConsume(count);
    },
    peek(key) {
      const b = buckets.get(key);
      if (!b) return { tokens: capacity, capacity };
      // Touch with a no-op consume of 0 to refill, then return
      b.tryConsume(0);
      return { tokens: b.tokens, capacity: b.capacity };
    },
    reset(key) {
      buckets.delete(key);
    },
    clear() {
      buckets.clear();
    },
  };
}

/**
 * Build a per-key SlidingWindow store backed by an in-process Map.
 *
 * @param {object} options
 * @param {number} options.windowMs
 * @param {number} options.max
 * @param {() => number} [options.now]
 * @returns {{
 *   tryRecord: (key: string) => boolean,
 *   count: (key: string) => number,
 *   retryAfterMs: (key: string) => number,
 *   reset: (key: string) => void,
 *   clear: () => void,
 * }}
 */
export function createMemorySlidingWindows({ windowMs, max, now = () => Date.now() }) {
  const windows = new Map();

  /** @param {string} key */
  function getWindow(key) {
    let w = windows.get(key);
    if (!w) {
      w = new SlidingWindow({ windowMs, max, now });
      windows.set(key, w);
    }
    return w;
  }

  return {
    tryRecord(key) {
      return getWindow(key).tryRecord();
    },
    count(key) {
      const w = windows.get(key);
      if (!w) return 0;
      return w.count();
    },
    retryAfterMs(key) {
      const w = windows.get(key);
      if (!w) return 0;
      return w.retryAfterMs();
    },
    reset(key) {
      windows.delete(key);
    },
    clear() {
      windows.clear();
    },
  };
}
