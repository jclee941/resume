/**
 * Pooled resource entry construction.
 *
 * @module orchestrator/resource-pool/pool-entry
 */

// Issue #16: closure-bound holder for monotonic counter; tests can reset.
const poolIdCounterHolder = (() => {
  let n = 0;
  return {
    next: () => ++n,
    reset: () => {
      n = 0;
    },
  };
})();

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
    id: `pool-${poolIdCounterHolder.next()}`,
    state: 'in_use',
  };
}

export function resetPoolIdCounter() {
  poolIdCounterHolder.reset();
}
