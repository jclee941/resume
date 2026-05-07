const DEFAULT_CAPACITY = 20;
const DEFAULT_REFILL_RATE = 20 / 60;
const DEFAULT_TTL_SECONDS = 60;
const DEFAULT_MAX_RETRIES = 3;

function clampTokens(value, capacity) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(capacity, value);
}

function computeResetTime(now, tokens, requiredTokens, refillRate) {
  if (tokens >= requiredTokens) return now;
  if (!Number.isFinite(refillRate) || refillRate <= 0) return now + DEFAULT_TTL_SECONDS * 1000;
  return now + Math.ceil(((requiredTokens - tokens) / refillRate) * 1000);
}

export class TokenBucketRateLimiter {
  constructor(env, options = {}) {
    this.kv = options.kv || env?.SESSIONS;
    this.capacity = options.capacity || DEFAULT_CAPACITY;
    this.refillRate = options.refillRate || DEFAULT_REFILL_RATE;
    this.keyPrefix = options.keyPrefix || 'rate_limit:telegram';
    this.ttlSeconds = options.ttlSeconds || DEFAULT_TTL_SECONDS;
    this.maxRetries = options.maxRetries || DEFAULT_MAX_RETRIES;
  }

  async checkLimit(id, tokens = 1) {
    const now = Date.now();
    const requested = Math.max(1, Number(tokens) || 1);
    try {
      const key = this._key(id);
      const { state, version } = await this._readState(key, now);
      const next = this._refill(state, now);
      const allowed = next.tokens >= requested;
      await this._writeState(key, next, version);
      return {
        allowed,
        remaining: Math.floor(Math.max(0, next.tokens - (allowed ? requested : 0))),
        resetTime: computeResetTime(now, next.tokens, requested, this.refillRate),
      };
    } catch {
      return this._deny(now);
    }
  }

  async consume(id, tokens = 1) {
    const now = Date.now();
    const requested = Math.max(1, Number(tokens) || 1);
    const key = this._key(id);
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const { state, version } = await this._readState(key, now);
        const refilled = this._refill(state, now);
        if (refilled.tokens < requested) {
          return {
            allowed: false,
            remaining: Math.floor(Math.max(0, refilled.tokens)),
            resetTime: computeResetTime(now, refilled.tokens, requested, this.refillRate),
          };
        }
        const next = { tokens: clampTokens(refilled.tokens - requested, this.capacity), lastRefill: now };
        if (await this._writeState(key, next, version)) {
          return { allowed: true, remaining: Math.floor(next.tokens), resetTime: now };
        }
      } catch {
        break;
      }
    }
    return this._deny(now);
  }

  async getState(id) {
    const now = Date.now();
    try {
      const { state } = await this._readState(this._key(id), now);
      const refilled = this._refill(state, now);
      return {
        tokens: refilled.tokens,
        lastRefill: refilled.lastRefill,
        remaining: Math.floor(refilled.tokens),
        resetTime: computeResetTime(now, refilled.tokens, 1, this.refillRate),
      };
    } catch {
      return { tokens: 0, lastRefill: now, remaining: 0, resetTime: now + this.ttlSeconds * 1000 };
    }
  }

  _key(id) {
    return `${this.keyPrefix}:${id}`;
  }

  _refill(state, now) {
    const lastRefill = Math.min(Number(state.lastRefill) || now, now);
    const tokens = clampTokens((Number(state.tokens) || 0) + ((now - lastRefill) / 1000) * this.refillRate, this.capacity);
    return { tokens, lastRefill: now };
  }

  async _readState(key, now) {
    if (typeof this.kv?.getWithMetadata === 'function') {
      const result = await this.kv.getWithMetadata(key, { type: 'json' });
      if (!result?.value) return { state: { tokens: this.capacity, lastRefill: now }, version: null };
      return { state: this._normalizeState(result.value, now), version: result.metadata?.version ?? null };
    }
    const value = await this.kv.get(key, { type: 'json' });
    return value
      ? { state: this._normalizeState(value, now), version: null }
      : { state: { tokens: this.capacity, lastRefill: now }, version: null };
  }

  _normalizeState(value, now) {
    return {
      tokens: clampTokens(value.tokens ?? this.capacity, this.capacity),
      lastRefill: Number(value.lastRefill) || now,
    };
  }

  async _writeState(key, state, version) {
    const payload = JSON.stringify({ tokens: state.tokens, lastRefill: state.lastRefill });
    if (typeof this.kv?.cas === 'function') {
      return this.kv.cas(key, payload, { expirationTtl: this.ttlSeconds, expectedVersion: version });
    }
    await this.kv.put(key, payload, { expirationTtl: this.ttlSeconds });
    return true;
  }

  _deny(now) {
    return { allowed: false, remaining: 0, resetTime: now + this.ttlSeconds * 1000 };
  }
}
