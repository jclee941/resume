import { EventEmitter } from 'events';
import { sleep } from './shared.js';

export class AsyncQueue extends EventEmitter {
  #queue = [];
  #running = 0;
  #concurrency;
  #processor;
  #results = [];
  #errors = [];
  #isProcessing = false;
  #isPaused = false;

  constructor(processor, options = {}) {
    super();
    this.#processor = processor;
    this.#concurrency = options.concurrency || 1;
  }

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
      const { item, resolve, reject } = this.#queue.shift();
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
