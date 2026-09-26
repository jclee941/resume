import { EventEmitter } from 'events';
import { sleep } from './shared.js';

/**
 * @template TItem, TResult
 * @typedef {Object} QueueEntry
 * @property {TItem} item
 * @property {(value: TResult | PromiseLike<TResult>) => void} resolve
 * @property {(reason?: unknown) => void} reject
 * @property {number} startTime
 */

/**
 * @typedef {Object} AsyncQueueOptions
 * @property {number} [concurrency]
 */

/**
 * @template TItem, TResult
 */
export class AsyncQueue extends EventEmitter {
  /** @type {QueueEntry<TItem, TResult>[]} */
  #queue = [];
  #running = 0;
  #concurrency;
  /** @type {(item: TItem) => Promise<TResult> | TResult} */
  #processor;
  /** @type {Array<{ item: TItem, result: TResult }>} */
  #results = [];
  /** @type {Array<{ item: TItem, error: unknown }>} */
  #errors = [];
  #isProcessing = false;
  #isPaused = false;

  /**
   * @param {(item: TItem) => Promise<TResult> | TResult} processor
   * @param {AsyncQueueOptions} [options]
   */
  constructor(processor, options = {}) {
    super();
    this.#processor = processor;
    this.#concurrency = options.concurrency || 1;
  }

  /**
   * @param {TItem} item
   * @returns {Promise<TResult>}
   */
  add(item) {
    return new Promise((resolve, reject) => {
      this.#queue.push({
        item,
        resolve,
        reject,
        startTime: Date.now(),
      });

      this.emit('added', { item, queueLength: this.#queue.length });
      this.#process();
    });
  }

  /**
   * @param {TItem[]} items
   * @returns {Promise<TResult[]>}
   */
  addAll(items) {
    return Promise.all(items.map((item) => this.add(item)));
  }

  pause() {
    this.#isPaused = true;
    this.emit('paused');
  }

  resume() {
    this.#isPaused = false;
    this.emit('resumed');
    this.#process();
  }

  /**
   * @param {boolean} [rejectPending=true]
   */
  clear(rejectPending = true) {
    if (rejectPending) {
      for (const { reject } of this.#queue) {
        reject(new Error('Queue cleared'));
      }
    }

    this.#queue = [];
    this.emit('cleared');
  }

  async drain() {
    while (this.#running > 0 || this.#queue.length > 0) {
      await sleep(100);
    }
  }

  getStats() {
    return {
      queued: this.#queue.length,
      running: this.#running,
      completed: this.#results.length,
      errors: this.#errors.length,
    };
  }

  async #process() {
    if (this.#isProcessing || this.#isPaused) return;
    if (this.#queue.length === 0) return;
    if (this.#running >= this.#concurrency) return;

    this.#isProcessing = true;

    while (this.#queue.length > 0 && this.#running < this.#concurrency && !this.#isPaused) {
      const entry = this.#queue.shift();
      if (!entry) break;
      const { item, resolve, reject } = entry;
      this.#running++;

      this.emit('started', { item, running: this.#running });

      try {
        const result = await this.#processor(item);
        this.#results.push({ item, result });
        resolve(result);
        this.emit('completed', { item, result });
      } catch (error) {
        this.#errors.push({ item, error });
        reject(error);
        this.emit('error', { item, error });
      } finally {
        this.#running--;
        this.emit('finished', { item, running: this.#running });
      }
    }

    this.#isProcessing = false;

    if (this.#queue.length > 0 && !this.#isPaused) {
      this.#process();
    } else if (this.#running === 0 && this.#queue.length === 0) {
      this.emit('drained');
    }
  }
}
