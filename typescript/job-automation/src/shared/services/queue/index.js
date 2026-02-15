const PRIORITY_ORDER = {
  urgent: 0,
  normal: 1,
  low: 2,
};

const DEFAULT_RETRY = {
  maxAttempts: 5,
  baseDelayMs: 250,
  maxDelayMs: 30000,
  jitter: true,
};

/**
 * @typedef {'urgent'|'normal'|'low'} JobPriority
 */

/**
 * @typedef {Object} QueueJob
 * @property {string} id
 * @property {unknown} payload
 * @property {JobPriority} priority
 * @property {number} attempts
 * @property {number} createdAt
 * @property {number} availableAt
 * @property {string} [source]
 */

/**
 * Job queue abstraction that works with Cloudflare Queues producers while
 * providing in-process dequeue/processing for server-side workers.
 */
export class JobQueue {
  /**
   * @param {{
   *   queue?: { send?: (body: unknown, options?: Record<string, unknown>) => Promise<void> },
   *   maxConcurrentWorkers?: number,
   *   retry?: Partial<DEFAULT_RETRY>,
   *   logger?: Pick<Console, 'info'|'warn'|'error'>,
   *   now?: () => number,
   * }} [options]
   */
  constructor(options = {}) {
    this.queue = options.queue;
    this.maxConcurrentWorkers = Math.max(1, options.maxConcurrentWorkers ?? 4);
    this.retry = { ...DEFAULT_RETRY, ...(options.retry || {}) };
    this.logger = options.logger || console;
    this.now = options.now || (() => Date.now());

    this.localQueues = {
      urgent: [],
      normal: [],
      low: [],
    };
  }

  /**
   * Enqueue a job with priority and optional delay.
   *
   * @param {unknown} job
   * @param {{ priority?: JobPriority, delayMs?: number, source?: string }} [options]
   * @returns {Promise<QueueJob>}
   */
  async enqueue(job, options = {}) {
    const priority = options.priority || 'normal';
    if (!(priority in PRIORITY_ORDER)) {
      throw new Error(`Unsupported priority: ${priority}`);
    }

    const delayMs = Math.max(0, options.delayMs || 0);
    const queueJob = {
      id: this.createId(),
      payload: job,
      priority,
      attempts: 0,
      createdAt: this.now(),
      availableAt: this.now() + delayMs,
      source: options.source,
    };

    this.localQueues[priority].push(queueJob);

    if (this.queue?.send) {
      const delaySeconds = Math.ceil(delayMs / 1000);
      await this.queue.send(queueJob, delaySeconds > 0 ? { delaySeconds } : undefined);
    }

    return queueJob;
  }

  /**
   * Dequeue the highest-priority available job.
   *
   * @returns {Promise<QueueJob|null>}
   */
  async dequeue() {
    const now = this.now();

    for (const priority of ['urgent', 'normal', 'low']) {
      const queue = this.localQueues[priority];
      const index = queue.findIndex((job) => job.availableAt <= now);
      if (index !== -1) {
        return queue.splice(index, 1)[0];
      }
    }

    return null;
  }

  /**
   * Process available jobs with bounded concurrency and retries.
   *
   * @template T
   * @param {(payload: unknown, job: QueueJob) => Promise<T>} handler
   * @returns {Promise<{ processed: number, succeeded: number, failed: number, retries: number }>}
   */
  async process(handler) {
    const summary = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      retries: 0,
    };

    /** @type {Promise<void>[]} */
    const workers = [];
    for (let i = 0; i < this.maxConcurrentWorkers; i += 1) {
      workers.push(this.runWorker(handler, summary));
    }

    await Promise.all(workers);
    return summary;
  }

  /**
   * @private
   * @template T
   * @param {(payload: unknown, job: QueueJob) => Promise<T>} handler
   * @param {{ processed: number, succeeded: number, failed: number, retries: number }} summary
   */
  async runWorker(handler, summary) {
    while (true) {
      const job = await this.dequeue();
      if (!job) {
        return;
      }

      summary.processed += 1;

      try {
        await handler(job.payload, job);
        summary.succeeded += 1;
      } catch (error) {
        const retried = await this.retryOrFail(job, summary, error);
        if (!retried) {
          summary.failed += 1;
        }
      }
    }
  }

  /**
   * @private
   * @param {QueueJob} job
   * @param {{ retries: number }} summary
   * @param {unknown} error
   * @returns {Promise<boolean>}
   */
  async retryOrFail(job, summary, error) {
    const nextAttempt = job.attempts + 1;
    if (nextAttempt >= this.retry.maxAttempts) {
      this.logger.error?.(`[JobQueue] Job ${job.id} failed after ${nextAttempt} attempts`, error);
      return false;
    }

    const backoffMs = this.calculateBackoffMs(nextAttempt);
    const nextJob = {
      ...job,
      attempts: nextAttempt,
      availableAt: this.now() + backoffMs,
    };

    this.localQueues[nextJob.priority].push(nextJob);
    summary.retries += 1;

    this.logger.warn?.(
      `[JobQueue] Retrying job ${job.id} in ${backoffMs}ms (attempt ${nextAttempt}/${
        this.retry.maxAttempts
      })`
    );

    if (this.queue?.send) {
      const delaySeconds = Math.ceil(backoffMs / 1000);
      await this.queue.send(nextJob, { delaySeconds });
    }

    return true;
  }

  /**
   * @private
   * @param {number} attempt
   * @returns {number}
   */
  calculateBackoffMs(attempt) {
    const exponential = Math.min(
      this.retry.maxDelayMs,
      this.retry.baseDelayMs * 2 ** Math.max(0, attempt - 1)
    );

    if (!this.retry.jitter) {
      return exponential;
    }

    const jitter = Math.floor(Math.random() * Math.max(1, Math.floor(exponential * 0.25)));
    return exponential + jitter;
  }

  /**
   * @private
   * @returns {string}
   */
  createId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `job_${this.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export default JobQueue;
