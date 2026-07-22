export class SlidingWindow {
  /**
   * @param {{ windowMs: number, max: number, now?: () => number }} options
   */
  constructor({ windowMs, max, now = () => Date.now() }) {
    if (!Number.isFinite(windowMs) || windowMs <= 0) {
      throw new RangeError('windowMs must be positive');
    }
    if (!Number.isFinite(max) || max <= 0) {
      throw new RangeError('max must be positive');
    }
    this.windowMs = windowMs;
    this.max = max;
    this.now = now;
    /** @type {number[]} */
    this.entries = [];
  }

  #prune() {
    const cutoff = this.now() - this.windowMs;
    while (this.entries.length > 0 && this.entries[0] < cutoff) {
      this.entries.shift();
    }
  }

  tryRecord() {
    this.#prune();
    if (this.entries.length >= this.max) return false;
    this.entries.push(this.now());
    return true;
  }

  count() {
    this.#prune();
    return this.entries.length;
  }

  retryAfterMs() {
    this.#prune();
    if (this.entries.length < this.max) return 0;
    const oldest = this.entries[0];
    return oldest + this.windowMs - this.now();
  }

  reset() {
    this.entries = [];
  }
}
