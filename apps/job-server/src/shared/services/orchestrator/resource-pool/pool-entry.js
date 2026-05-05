/**
 * Pooled resource entry construction.
 *
 * Issue #16 / P0-5 — Slice A: replaces the closure-bound monotonic-counter
 * holder with the canonical TaskIdCounter class (introduced in PR #178)
 * via a module-level singleton. The free-function call surface
 * (`createPooledResource`, `resetPoolIdCounter`) is unchanged so the one
 * existing consumer (`resource-pool.js`) keeps working.
 *
 * @module orchestrator/resource-pool/pool-entry
 */

import { TaskIdCounter } from '../progress-tracker/task-id-counter.js';

// Module-level singleton — back-compat for the existing call site.
const defaultPoolIdCounter = new TaskIdCounter();

/**
 * @template T
 * @param {T} resource
 * @returns {import('./types.js').PooledResource<T>}
 */
export function createPooledResource(resource) {
  return {
    resource,
    createdAt: Date.now(),
    lastUsedAt: Date.now(),
    useCount: 1,
    id: `pool-${defaultPoolIdCounter.next()}`,
    state: 'in_use',
  };
}

export function resetPoolIdCounter() {
  defaultPoolIdCounter.reset();
}
