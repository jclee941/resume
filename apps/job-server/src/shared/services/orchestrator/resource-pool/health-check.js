/**
 * Idle resource health-check routines.
 *
 * @module orchestrator/resource-pool/health-check
 */

/**
 * @template T
 * @param {import('./types.js').ResourcePoolState<T>} state
 * @param {(pooled: import('./types.js').PooledResource<T>) => Promise<void>} destroyResource
 * @returns {Promise<number>}
 */
export async function removeUnhealthyIdleResources(state, destroyResource) {
  const now = Date.now();
  const toRemove = [];

  for (let i = state.idle.length - 1; i >= 0; i--) {
    const pooled = state.idle[i];

    if (isIdleExpired(state, pooled, toRemove.length, now)) {
      toRemove.push(i);
      continue;
    }

    if (now - pooled.createdAt > state.options.maxAge) {
      toRemove.push(i);
      continue;
    }

    if (state.options.validate) {
      try {
        const valid = await state.options.validate(pooled.resource);
        if (!valid) toRemove.push(i);
      } catch (error) {
        state.logger.error('[ResourcePool.healthCheck] Validation failed:', error.message);
        toRemove.push(i);
      }
    }
  }

  for (const idx of toRemove) {
    const [pooled] = state.idle.splice(idx, 1);
    await destroyResource(pooled);
  }

  return toRemove.length;
}

/**
 * @template T
 * @param {import('./types.js').ResourcePoolState<T>} state
 * @param {import('./types.js').PooledResource<T>} pooled
 * @param {number} pendingRemovalCount
 * @param {number} now
 * @returns {boolean}
 */
function isIdleExpired(state, pooled, pendingRemovalCount, now) {
  return (
    now - pooled.lastUsedAt > state.options.idleTimeoutMs &&
    state.idle.length - pendingRemovalCount > state.options.minSize
  );
}
