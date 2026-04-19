import { EventEmitter } from 'events';

export class WorkerPool extends EventEmitter {
  #workers = [];
  #available = [];
  #queue = [];
  #workerFactory;
  #maxWorkers;
  #isDestroyed = false;

  constructor(workerFactory, options = {}) {
    super();
    this.#workerFactory = workerFactory;
    this.#maxWorkers = options.maxWorkers || 4;
  }

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

  async executeAll(tasks) {
    return Promise.all(tasks.map((task) => this.execute(task)));
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
      const { reject } = this.#queue.shift();
      reject(new Error('Pool destroyed'));
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

  async #acquire() {
    if (this.#available.length > 0) {
      return this.#available.pop();
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

  #release(worker) {
    if (this.#queue.length > 0) {
      const { resolve } = this.#queue.shift();
      resolve(worker);
      return;
    }

    this.#available.push(worker);
  }
}
