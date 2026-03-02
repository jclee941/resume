/**
 * Real-time progress tracking for parallel crawl operations.
 *
 * Emits structured progress events and maintains per-platform/per-task
 * status for monitoring dashboards and logging.
 *
 * @module orchestrator/progress-tracker
 */

import { EventEmitter } from 'node:events';

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

let taskIdCounter = 0;

export class ProgressTracker extends EventEmitter {
  /** @type {Map<string, TaskState>} */
  #tasks = new Map();

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
    const id = `task-${++taskIdCounter}`;

    /** @type {TaskState} */
    const task = {
      id,
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
    const tasks = [...this.#tasks.values()];
    return tasks.filter((t) => {
      if (filter.platform && t.platform !== filter.platform) return false;
      if (filter.status && t.status !== filter.status) return false;
      if (filter.type && t.type !== filter.type) return false;
      return true;
    });
  }

  /**
   * Get per-platform summary.
   * @returns {Record<string, { total: number, pending: number, running: number, completed: number, failed: number, cancelled: number }>}
   */
  getPlatformSummary() {
    /** @type {Record<string, { total: number, pending: number, running: number, completed: number, failed: number, cancelled: number }>} */
    const summary = {};

    for (const task of this.#tasks.values()) {
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
   * Get overall progress summary.
   * @returns {{ totalTasks: number, progress: number, counters: typeof ProgressTracker.prototype['#counters'] extends never ? never : { started: number, completed: number, failed: number, cancelled: number }, elapsedMs: number, tasksPerSecond: number }}
   */
  getOverallProgress() {
    const total = this.#tasks.size;
    const finished = this.#counters.completed + this.#counters.failed + this.#counters.cancelled;
    const elapsed = Date.now() - this.#startTime;

    return {
      totalTasks: total,
      progress: total > 0 ? Math.round((finished / total) * 100) : 0,
      counters: { ...this.#counters },
      elapsedMs: elapsed,
      tasksPerSecond: elapsed > 0 ? this.#counters.completed / (elapsed / 1000) : 0,
    };
  }

  /**
   * Check if all tasks are finished (completed, failed, or cancelled).
   * @returns {boolean}
   */
  isComplete() {
    for (const task of this.#tasks.values()) {
      if (task.status === 'pending' || task.status === 'running') return false;
    }
    return this.#tasks.size > 0;
  }

  /**
   * Reset all tracking state.
   */
  reset() {
    this.#tasks.clear();
    this.#counters = { started: 0, completed: 0, failed: 0, cancelled: 0 };
    this.#startTime = Date.now();
    taskIdCounter = 0;
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
