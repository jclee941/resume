/**
 * Monotonic task ID counter for progress trackers.
 *
 * Issue #16 / P0-5 — Slice A: replaces the closure-bound holder with an
 * explicit class so each instance owns its state. The module also exports
 * a default singleton (`nextTaskId` / `resetTaskIdCounter`) for backward
 * compatibility with existing call sites; new code can construct its own
 * `TaskIdCounter` for test isolation or per-orchestrator counters.
 *
 * @module orchestrator/progress-tracker/task-id-counter
 */

export class TaskIdCounter {
  #n;

  /**
   * @param {Object} [options]
   * @param {number} [options.start=0] - initial counter value (next() returns start+1)
   */
  constructor(options = {}) {
    this.#n = typeof options.start === 'number' ? options.start : 0;
  }

  /**
   * @returns {number} the next monotonic value
   */
  next() {
    return ++this.#n;
  }

  /**
   * Reset the sequence to 0 (next() then returns 1).
   */
  reset() {
    this.#n = 0;
  }

  /**
   * @returns {number} the current value without advancing
   */
  peek() {
    return this.#n;
  }
}

// Module-level singleton preserves the original `nextTaskId()` / `resetTaskIdCounter()`
// API. New code that wants test isolation should construct its own TaskIdCounter.
const defaultCounter = new TaskIdCounter();

/**
 * Generate the next task ID using the module-level singleton counter.
 * @returns {string}
 */
export function nextTaskId() {
  return `task-${defaultCounter.next()}`;
}

/**
 * Reset the module-level singleton counter.
 */
export function resetTaskIdCounter() {
  defaultCounter.reset();
}
