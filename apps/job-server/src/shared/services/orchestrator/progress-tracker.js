/**
 * Real-time progress tracking for parallel crawl operations.
 *
 * Emits structured progress events and maintains per-platform/per-task
 * status for monitoring dashboards and logging.
 *
 * @module orchestrator/progress-tracker
 */

import { EventEmitter } from 'node:events';
import { buildOverallProgress } from './progress-tracker/progress-summary.js';
import { resetTaskIdCounter } from './progress-tracker/task-id-counter.js';
import {
  areTasksComplete,
  filterTasks,
  summarizeTasksByPlatform,
} from './progress-tracker/task-queries.js';
import { applyTaskProgressUpdate, createTaskState } from './progress-tracker/task-state.js';

/**
 * @import { TaskState, TaskStatus } from './progress-tracker/task-state.js'
 */

export class ProgressTracker extends EventEmitter {
  /** @type {Map<string, TaskState>} */
  #tasks = new Map();

  constructor() {
    super();
    this.setMaxListeners(20);
  }

  /** @type {{ started: number, completed: number, failed: number, cancelled: number }} */
  #counters = { started: 0, completed: 0, failed: 0, cancelled: 0 };

  /** @type {number} */
  #startTime = Date.now();

  /**
   * Register a new task for tracking.
   * @param {string} platform
   * @param {string} type
   * @param {{ itemsTotal?: number, metadata?: Record<string, unknown> }} [options]
   * @returns {string} Task ID
   */
  addTask(platform, type, options = {}) {
    const task = createTaskState(platform, type, options);
    const { id } = task;

    this.#tasks.set(id, task);
    this.emit('task:added', { taskId: id, platform, type });
    return id;
  }

  /**
   * Mark a task as started.
   * @param {string} taskId
   */
  startTask(taskId) {
    const task = this.#getTask(taskId);
    task.status = 'running';
    task.startedAt = Date.now();
    this.#counters.started++;
    this.emit('task:started', { taskId, platform: task.platform, type: task.type });
  }

  /**
   * Update task progress.
   * @param {string} taskId
   * @param {{ itemsProcessed?: number, itemsTotal?: number, progress?: number, metadata?: Record<string, unknown> }} update
   */
  updateProgress(taskId, update) {
    const task = this.#getTask(taskId);
    applyTaskProgressUpdate(task, update);

    this.emit('task:progress', {
      taskId,
      platform: task.platform,
      type: task.type,
      progress: task.progress,
      itemsProcessed: task.itemsProcessed,
      itemsTotal: task.itemsTotal,
    });
  }

  /**
   * Mark a task as completed.
   * @param {string} taskId
   * @param {Record<string, unknown>} [result]
   */
  completeTask(taskId, result) {
    const task = this.#getTask(taskId);
    task.status = 'completed';
    task.completedAt = Date.now();
    task.progress = 100;
    if (result) {
      task.metadata = { ...task.metadata, result };
    }
    this.#counters.completed++;

    this.emit('task:completed', {
      taskId,
      platform: task.platform,
      type: task.type,
      durationMs: task.completedAt - (task.startedAt || task.createdAt),
      result,
    });

    this.#emitOverallProgress();
  }

  /**
   * Mark a task as failed.
   * @param {string} taskId
   * @param {Error} error
   */
  failTask(taskId, error) {
    const task = this.#getTask(taskId);
    task.status = 'failed';
    task.completedAt = Date.now();
    task.error = error;
    this.#counters.failed++;

    this.emit('task:failed', {
      taskId,
      platform: task.platform,
      type: task.type,
      error: error.message,
      durationMs: task.completedAt - (task.startedAt || task.createdAt),
    });

    this.#emitOverallProgress();
  }

  /**
   * Mark a task as cancelled.
   * @param {string} taskId
   */
  cancelTask(taskId) {
    const task = this.#getTask(taskId);
    if (task.status === 'completed' || task.status === 'failed') return;
    task.status = 'cancelled';
    task.completedAt = Date.now();
    this.#counters.cancelled++;

    this.emit('task:cancelled', {
      taskId,
      platform: task.platform,
      type: task.type,
    });

    this.#emitOverallProgress();
  }

  /**
   * Get a specific task's state.
   * @param {string} taskId
   * @returns {Readonly<TaskState>}
   */
  getTask(taskId) {
    return { ...this.#getTask(taskId) };
  }

  /**
   * Get tasks filtered by platform and/or status.
   * @param {{ platform?: string, status?: TaskStatus, type?: string }} [filter]
   * @returns {TaskState[]}
   */
  getTasks(filter = {}) {
    return filterTasks(this.#tasks.values(), filter);
  }

  /**
   * Get per-platform summary.
   * @returns {Record<string, { total: number, pending: number, running: number, completed: number, failed: number, cancelled: number }>}
   */
  getPlatformSummary() {
    return summarizeTasksByPlatform(this.#tasks.values());
  }

  /**
   * Get overall progress summary.
   * @returns {{ totalTasks: number, progress: number, counters: typeof ProgressTracker.prototype['#counters'] extends never ? never : { started: number, completed: number, failed: number, cancelled: number }, elapsedMs: number, tasksPerSecond: number }}
   */
  getOverallProgress() {
    return buildOverallProgress(this.#tasks.size, this.#counters, this.#startTime);
  }

  /**
   * Check if all tasks are finished (completed, failed, or cancelled).
   * @returns {boolean}
   */
  isComplete() {
    return areTasksComplete(this.#tasks.values(), this.#tasks.size);
  }

  /**
   * Reset all tracking state.
   */
  reset() {
    this.#tasks.clear();
    this.#counters = { started: 0, completed: 0, failed: 0, cancelled: 0 };
    this.#startTime = Date.now();
    resetTaskIdCounter();
  }

  /**
   * Destroys the tracker, removing all listeners and clearing state.
   * Call this during shutdown to prevent memory leaks.
   */
  destroy() {
    this.reset();
    this.removeAllListeners();
  }

  /**
   * Get a task, throwing if not found.
   * @param {string} taskId
   * @returns {TaskState}
   */
  #getTask(taskId) {
    const task = this.#tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    return task;
  }

  /**
   * Emit overall progress event.
   */
  #emitOverallProgress() {
    const progress = this.getOverallProgress();
    this.emit('progress', progress);

    if (this.isComplete()) {
      this.emit('complete', progress);
    }
  }
}
