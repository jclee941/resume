/**
 * Monotonic task ID counter for progress trackers.
 *
 * Kept closure-bound so tests can reset deterministic task IDs without
 * exposing mutable module state directly.
 *
 * @module orchestrator/progress-tracker/task-id-counter
 */

const taskIdCounterHolder = (() => {
  let n = 0;
  return {
    next: () => ++n,
    reset: () => {
      n = 0;
    },
  };
})();

/**
 * Generate the next task ID.
 * @returns {string}
 */
export function nextTaskId() {
  return `task-${taskIdCounterHolder.next()}`;
}

/**
 * Reset task ID sequencing.
 */
export function resetTaskIdCounter() {
  taskIdCounterHolder.reset();
}
