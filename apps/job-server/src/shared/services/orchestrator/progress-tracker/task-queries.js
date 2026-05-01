/**
 * Read-side query helpers for progress tracker task collections.
 *
 * @module orchestrator/progress-tracker/task-queries
 */

/**
 * @import { TaskState, TaskStatus } from './task-state.js'
 */

/**
 * Filter task states by platform, status, and/or type.
 * @param {Iterable<TaskState>} tasks
 * @param {{ platform?: string, status?: TaskStatus, type?: string }} [filter]
 * @returns {TaskState[]}
 */
export function filterTasks(tasks, filter = {}) {
  return [...tasks].filter((task) => {
    if (filter.platform && task.platform !== filter.platform) return false;
    if (filter.status && task.status !== filter.status) return false;
    if (filter.type && task.type !== filter.type) return false;
    return true;
  });
}

/**
 * Build per-platform status counts.
 * @param {Iterable<TaskState>} tasks
 * @returns {Record<string, { total: number, pending: number, running: number, completed: number, failed: number, cancelled: number }>}
 */
export function summarizeTasksByPlatform(tasks) {
  /** @type {Record<string, { total: number, pending: number, running: number, completed: number, failed: number, cancelled: number }>} */
  const summary = {};

  for (const task of tasks) {
    if (!summary[task.platform]) {
      summary[task.platform] = {
        total: 0,
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
      };
    }
    summary[task.platform].total++;
    summary[task.platform][task.status]++;
  }

  return summary;
}

/**
 * Check whether all known tasks have reached a terminal status.
 * @param {Iterable<TaskState>} tasks
 * @param {number} taskCount
 * @returns {boolean}
 */
export function areTasksComplete(tasks, taskCount) {
  for (const task of tasks) {
    if (task.status === 'pending' || task.status === 'running') return false;
  }
  return taskCount > 0;
}
