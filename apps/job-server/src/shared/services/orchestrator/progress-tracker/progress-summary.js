/**
 * Overall progress summary calculations.
 *
 * @module orchestrator/progress-tracker/progress-summary
 */

/**
 * @typedef {{ started: number, completed: number, failed: number, cancelled: number }} ProgressCounters
 */

/**
 * Build overall progress summary from task counts and counters.
 * @param {number} totalTasks
 * @param {ProgressCounters} counters
 * @param {number} startTime
 * @returns {{ totalTasks: number, progress: number, counters: ProgressCounters, elapsedMs: number, tasksPerSecond: number }}
 */
export function buildOverallProgress(totalTasks, counters, startTime) {
  const finished = counters.completed + counters.failed + counters.cancelled;
  const elapsed = Date.now() - startTime;

  return {
    totalTasks,
    progress: totalTasks > 0 ? Math.round((finished / totalTasks) * 100) : 0,
    counters: { ...counters },
    elapsedMs: elapsed,
    tasksPerSecond: elapsed > 0 ? counters.completed / (elapsed / 1000) : 0,
  };
}
