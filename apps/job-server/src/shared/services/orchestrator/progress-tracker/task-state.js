/**
 * Task state creation and mutation helpers for progress tracking.
 *
 * @module orchestrator/progress-tracker/task-state
 */

import { nextTaskId } from './task-id-counter.js';

/**
 * @typedef {'pending'|'running'|'completed'|'failed'|'cancelled'} TaskStatus
 */

/**
 * @typedef {Object} TaskState
 * @property {string} id - Unique task identifier
 * @property {string} platform - Platform name (e.g., 'wanted', 'linkedin')
 * @property {string} type - Task type (e.g., 'search', 'detail', 'apply')
 * @property {TaskStatus} status - Current status
 * @property {number} createdAt - Creation timestamp
 * @property {number|null} startedAt - Start timestamp
 * @property {number|null} completedAt - Completion timestamp
 * @property {number} progress - 0-100 percentage
 * @property {number} itemsProcessed - Items processed so far
 * @property {number} itemsTotal - Total items expected
 * @property {Error|null} error - Error if failed
 * @property {Record<string, unknown>} metadata - Arbitrary metadata
 */

/**
 * Create initial tracked task state.
 * @param {string} platform
 * @param {string} type
 * @param {{ itemsTotal?: number, metadata?: Record<string, unknown> }} [options]
 * @returns {TaskState}
 */
export function createTaskState(platform, type, options = {}) {
  return {
    id: nextTaskId(),
    platform,
    type,
    status: 'pending',
    createdAt: Date.now(),
    startedAt: null,
    completedAt: null,
    progress: 0,
    itemsProcessed: 0,
    itemsTotal: options.itemsTotal || 0,
    error: null,
    metadata: options.metadata || {},
  };
}

/**
 * Apply a progress update to a task state.
 * @param {TaskState} task
 * @param {{ itemsProcessed?: number, itemsTotal?: number, progress?: number, metadata?: Record<string, unknown> }} update
 */
export function applyTaskProgressUpdate(task, update) {
  if (update.itemsProcessed !== undefined) {
    task.itemsProcessed = update.itemsProcessed;
  }
  if (update.itemsTotal !== undefined) {
    task.itemsTotal = update.itemsTotal;
  }
  if (update.progress !== undefined) {
    task.progress = Math.min(100, Math.max(0, update.progress));
  } else if (task.itemsTotal > 0) {
    task.progress = Math.round((task.itemsProcessed / task.itemsTotal) * 100);
  }
  if (update.metadata) {
    task.metadata = { ...task.metadata, ...update.metadata };
  }
}
