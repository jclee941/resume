/**
 * Resource acquisition wait queue helpers.
 *
 * @module orchestrator/resource-pool/wait-queue
 */

/**
 * @template T
 * @param {import('./types.js').ResourcePoolState<T>} state
 * @returns {Promise<T>}
 */
export function waitForResource(state) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const index = state.waitQueue.findIndex((w) => w.resolve === resolve);
      if (index !== -1) {
        state.waitQueue.splice(index, 1);
      }
      reject(new Error(`Acquire timeout after ${state.options.acquireTimeoutMs}ms`));
    }, state.options.acquireTimeoutMs);

    state.waitQueue.push({ resolve, reject, timer });
  });
}

/**
 * @template T
 * @param {import('./types.js').ResourcePoolState<T>} state
 * @param {Error} error
 */
export function rejectAllWaiters(state, error) {
  for (const waiter of state.waitQueue) {
    clearTimeout(waiter.timer);
    waiter.reject(error);
  }
  state.waitQueue = [];
}

/**
 * @template T
 * @param {import('./types.js').ResourcePoolState<T>} state
 * @returns {{ resolve: (r: T) => void, reject: (e: Error) => void, timer: ReturnType<typeof setTimeout> }|undefined}
 */
export function shiftWaiter(state) {
  const waiter = state.waitQueue.shift();
  if (waiter) clearTimeout(waiter.timer);
  return waiter;
}
