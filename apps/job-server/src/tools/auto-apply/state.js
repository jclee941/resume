/**
 * Auto-apply tool session state.
 *
 * Issue #16 / P0-5 Slice C step 1: replaces the closure-bound holder with
 * an explicit `AutoApplySessionState` class so multiple invocations
 * (different MCP clients, parallel workflows, tests) own isolated state.
 *
 * The free-function `getSessionState()` is preserved as a thin wrapper
 * around a module-level singleton for back-compat with the one consumer
 * (`apps/job-server/src/tools/auto-apply.js`).
 */

export function createDefaultState() {
  return {
    jobsSearched: 0,
    jobsMatched: 0,
    jobsApplied: 0,
    jobsFailed: 0,
    applications: [],
    lastRunAt: null,
    preferences: {
      matchScoreThreshold: 75,
      dailyApplicationLimit: 20,
      preferredPlatforms: ['wanted'],
    },
  };
}

/**
 * Self-contained session state container. Each instance owns its own
 * state object so two MCP clients / two test cases / two CF Worker
 * isolates do not share or leak state through this module.
 */
export class AutoApplySessionState {
  #state;

  constructor() {
    this.#state = null;
  }

  /**
   * Get the current state, lazily initializing on first access.
   * @returns {ReturnType<typeof createDefaultState>}
   */
  get() {
    if (!this.#state) {
      this.#state = createDefaultState();
    }
    return this.#state;
  }

  /**
   * Replace the state wholesale.
   */
  set(value) {
    this.#state = value;
  }

  /**
   * Reset to a fresh default state.
   */
  reset() {
    this.#state = createDefaultState();
  }

  /**
   * Drop the state entirely (next get() will re-initialize lazily).
   */
  clear() {
    this.#state = null;
  }
}

// Module-level singleton — back-compat for the one existing consumer.
const defaultSession = new AutoApplySessionState();

export function getSessionState() {
  return defaultSession.get();
}
