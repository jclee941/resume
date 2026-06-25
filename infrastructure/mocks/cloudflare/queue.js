import { randomUUID } from 'node:crypto';

export class MockQueue {
  constructor(options = {}) {
    this.name = options.name || 'mock-queue';
    this.worker = options.worker || null;
    this.messages = [];
    this.processing = false;
  }

  async send(body, options = {}) {
    const delayMs = Math.max(0, Math.floor((options.delaySeconds || 0) * 1000));
    this.messages.push({
      id: randomUUID(),
      body,
      attempts: 1,
      availableAt: Date.now() + delayMs,
    });
    await this.#schedule();
  }

  async sendBatch(batch) {
    for (const item of batch) {
      if (item && typeof item === 'object' && 'body' in item) {
        const delaySeconds =
          'delaySeconds' in item && typeof item.delaySeconds === 'number' ? item.delaySeconds : 0;
        await this.send(item.body, { delaySeconds });
      } else {
        await this.send(item);
      }
    }
  }

  async processNow() {
    if (!this.worker || this.processing) return;
    this.processing = true;
    try {
      const now = Date.now();
      const ready = this.messages.filter((m) => m.availableAt <= now);
      this.messages = this.messages.filter((m) => m.availableAt > now);
      if (ready.length === 0) return;

      const state = ready.map((m) => ({
        id: m.id,
        body: m.body,
        attempts: m.attempts,
        acked: false,
        retriedWithDelay: null,
      }));
      const messages = state.map((s) => ({
        id: s.id,
        body: s.body,
        attempts: s.attempts,
        ack: () => {
          s.acked = true;
        },
        retry: (options = {}) => {
          s.retriedWithDelay = Math.max(0, Math.floor((options.delaySeconds || 0) * 1000));
        },
      }));

      await this.worker({
        queue: this.name,
        messages,
      });

      for (const s of state) {
        if (s.retriedWithDelay != null) {
          this.messages.push({
            id: s.id,
            body: s.body,
            attempts: s.attempts + 1,
            availableAt: Date.now() + s.retriedWithDelay,
          });
        }
      }
    } finally {
      this.processing = false;
      if (this.messages.some((m) => m.availableAt <= Date.now())) {
        await this.#schedule();
      }
    }
  }

  clear() {
    this.messages = [];
  }

  async #schedule() {
    if (!this.worker) return;
    queueMicrotask(() => {
      void this.processNow();
    });
  }
}
