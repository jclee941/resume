export class TokenBucket {
  /**
   * @param {{ capacity: number, refillRatePerSecond: number, now?: () => number }} options
   */
  constructor({ capacity, refillRatePerSecond, now = () => Date.now() }) {
    if (!Number.isFinite(capacity) || capacity <= 0) {
      throw new RangeError('capacity must be a positive number');
    }
    if (!Number.isFinite(refillRatePerSecond) || refillRatePerSecond <= 0) {
      throw new RangeError('refillRatePerSecond must be a positive number');
    }
    this.capacity = capacity;
    this.refillRatePerSecond = refillRatePerSecond;
    this.now = now;
    this.tokens = capacity;
    this.lastRefillAt = now();
  }

  #refill() {
    const nowMs = this.now();
    const elapsed = (nowMs - this.lastRefillAt) / 1000;
    if (elapsed > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRatePerSecond);
      this.lastRefillAt = nowMs;
    }
  }

  tryConsume(count = 1) {
    this.#refill();
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }
    return false;
  }

  retryAfterMsFor(count = 1) {
    this.#refill();
    if (this.tokens >= count) return 0;
    const deficit = count - this.tokens;
    return Math.ceil((deficit / this.refillRatePerSecond) * 1000);
  }

  snapshot() {
    this.#refill();
    return {
      capacity: this.capacity,
      tokens: this.tokens,
      refillRatePerSecond: this.refillRatePerSecond,
      lastRefillAt: this.lastRefillAt,
    };
  }
}
