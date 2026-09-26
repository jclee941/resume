import { EventEmitter } from 'events';

/**
 * @template TTask, TResult
 * @typedef {Object} WorkerInstance
 * @property {(task: TTask) => Promise<TResult> | TResult} process
 * @property {() => Promise<void> | void} [destroy]
 */

/**
 * @typedef {Object} WorkerPoolOptions
 * @property {number} [maxWorkers]
 */

/**
 * @template TTask, TResult
 * @typedef {Object} PoolQueueEntry
 * @property {(worker: WorkerInstance<TTask, TResult>) => void} resolve
 * @property {(err: Error) => void} reject
 */

/**
 * @template TTask, TResult
 */
export class WorkerPool extends EventEmitter {
  /** @type {WorkerInstance<TTask, TResult>[]} */
  #workers = [];
  /** @type {WorkerInstance<TTask, TResult>[]} */
  #available = [];
  /** @type {PoolQueueEntry<TTask, TResult>[]} */
  #queue = [];
  /** @type {() => Promise<WorkerInstance<TTask, TResult>> | WorkerInstance<TTask, TResult>} */
  #workerFactory;
  #maxWorkers;
  #isDestroyed = false;

  /**
   * @param {() => Promise<WorkerInstance<TTask, TResult>> | WorkerInstance<TTask, TResult>} workerFactory
   * @param {WorkerPoolOptions} [options]
   */
  constructor(workerFactory, options = {}) {
    super();
    this.#workerFactory = workerFactory;
    this.#maxWorkers = options.maxWorkers || 4;
  }

  /**
   * @param {TTask} task
   * @returns {Promise<TResult>}
   */
  async execute(task) {
    if (this.#isDestroyed) {
      throw new Error('Worker pool destroyed');
    }

    const worker = await this.#acquire();

    try {
      const result = await worker.process(task);
      this.#release(worker);
      return result;
    } catch (error) {
      this.#release(worker);
      throw error;
    }
  }

  getStats() {
    return {
      total: this.#workers.length,
      available: this.#available.length,
      busy: this.#workers.length - this.#available.length,
      queued: this.#queue.length,
    };
  }

  async destroy() {
    this.#isDestroyed = true;

    while (this.#queue.length > 0) {
      const entry = this.#queue.shift();
      if (entry) {
        entry.reject(new Error('Pool destroyed'));
      }
    }

    await Promise.all(
      this.#workers.map(async (worker) => {
        if (worker.destroy) {
          await worker.destroy();
        }
      })
    );

    this.#workers = [];
    this.#available = [];
  }

  /**
   * @returns {Promise<WorkerInstance<TTask, TResult>>}
   */
  async #acquire() {
    if (this.#available.length > 0) {
      const worker = this.#available.pop();
      if (worker) return worker;
    }

    if (this.#workers.length < this.#maxWorkers) {
      const worker = await this.#workerFactory();
      this.#workers.push(worker);
      return worker;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.#queue.findIndex((item) => item.resolve === resolve);
        if (index > -1) {
          this.#queue.splice(index, 1);
        }
        reject(new Error('Worker acquisition timeout'));
      }, 30000);

      this.#queue.push({
        resolve: (worker) => {
          clearTimeout(timeout);
          resolve(worker);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        },
      });
    });
  }

  /**
   * @param {WorkerInstance<TTask, TResult>} worker
   */
  #release(worker) {
    if (this.#queue.length > 0) {
      const entry = this.#queue.shift();
      if (entry) {
        entry.resolve(worker);
        return;
      }
    }

    this.#available.push(worker);
  }
}
