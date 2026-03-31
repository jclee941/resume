const DEFAULT_CAPACITY = 20;
const DEFAULT_REFILL_RATE = 20 / 60;
const DEFAULT_TTL_SECONDS = 60;
const DEFAULT_MAX_RETRIES = 3;

function clampTokens(value, capacity) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  return Math.min(capacity, value);
}

function computeResetTime(now, tokens, requiredTokens, refillRate) {
  if (tokens >= requiredTokens) {
    return now;
  }

  if (!Number.isFinite(refillRate) || refillRate <= 0) {
    return now + DEFAULT_TTL_SECONDS * 1000;
  }

  const deficit = requiredTokens - tokens;
  const secondsToRefill = deficit / refillRate;
  return now + Math.ceil(secondsToRefill * 1000);
}

export class TokenBucketRateLimiter {
  constructor(env, options = {}) {
    this.kv = env.SESSIONS;
    this.capacity = options.capacity || DEFAULT_CAPACITY;
    this.refillRate = options.refillRate || DEFAULT_REFILL_RATE;
    this.keyPrefix = options.keyPrefix || 'rate_limit:telegram';
    this.ttlSeconds = options.ttlSeconds || DEFAULT_TTL_SECONDS;
    this.maxRetries = options.maxRetries || DEFAULT_MAX_RETRIES;
  }

  async checkLimit(chatId, tokens = 1) {
    const now = Date.now();
    const requestedTokens = Math.max(1, Number(tokens) || 1);

    try {
      const key = this._key(chatId);
      const { state, version } = await this._readState(key, now);
      const nextState = this._refill(state, now);
      const allowed = nextState.tokens >= requestedTokens;

      await this._writeState(key, nextState, version);

      return {
        allowed,
        remaining: Math.floor(Math.max(0, nextState.tokens - (allowed ? requestedTokens : 0))),
        resetTime: computeResetTime(now, nextState.tokens, requestedTokens, this.refillRate),
      };
    } catch {
      return {
        allowed: false,
        remaining: 0,
        resetTime: now + this.ttlSeconds * 1000,
      };
    }
  }

  async consume(chatId, tokens = 1) {
    const now = Date.now();
    const requestedTokens = Math.max(1, Number(tokens) || 1);
    const key = this._key(chatId);

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const { state, version } = await this._readState(key, now);
        const refilled = this._refill(state, now);

        if (refilled.tokens < requestedTokens) {
          return {
            allowed: false,
            remaining: Math.floor(Math.max(0, refilled.tokens)),
            resetTime: computeResetTime(now, refilled.tokens, requestedTokens, this.refillRate),
          };
        }

        const nextState = {
          tokens: clampTokens(refilled.tokens - requestedTokens, this.capacity),
          lastRefill: now,
        };

        const committed = await this._writeState(key, nextState, version);
        if (!committed) {
          continue;
        }

        return {
          allowed: true,
          remaining: Math.floor(nextState.tokens),
          resetTime: now,
        };
      } catch {
        break;
      }
    }

    return {
      allowed: false,
      remaining: 0,
      resetTime: now + this.ttlSeconds * 1000,
    };
  }

  async getState(chatId) {
    const now = Date.now();
    const key = this._key(chatId);

    try {
      const { state } = await this._readState(key, now);
      const refilled = this._refill(state, now);
      return {
        tokens: refilled.tokens,
        lastRefill: refilled.lastRefill,
        remaining: Math.floor(refilled.tokens),
        resetTime: computeResetTime(now, refilled.tokens, 1, this.refillRate),
      };
    } catch {
      return {
        tokens: 0,
        lastRefill: now,
        remaining: 0,
        resetTime: now + this.ttlSeconds * 1000,
      };
    }
  }

  _key(chatId) {
    return `${this.keyPrefix}:${chatId}`;
  }

  _refill(state, now) {
    const lastRefill = Number(state.lastRefill) || now;
    const safeLastRefill = Math.min(lastRefill, now);
    const timePassed = (now - safeLastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;
    const nextTokens = clampTokens((Number(state.tokens) || 0) + tokensToAdd, this.capacity);

    return {
      tokens: nextTokens,
      lastRefill: now,
    };
  }

  async _readState(key, now) {
    if (typeof this.kv?.getWithMetadata === 'function') {
      const result = await this.kv.getWithMetadata(key, { type: 'json' });
      if (!result?.value) {
        return {
          state: { tokens: this.capacity, lastRefill: now },
          version: null,
        };
      }

      return {
        state: {
          tokens: clampTokens(result.value.tokens ?? this.capacity, this.capacity),
          lastRefill: Number(result.value.lastRefill) || now,
        },
        version: result.metadata?.version ?? null,
      };
    }

    const value = await this.kv.get(key, { type: 'json' });
    if (!value) {
      return {
        state: { tokens: this.capacity, lastRefill: now },
        version: null,
      };
    }

    return {
      state: {
        tokens: clampTokens(value.tokens ?? this.capacity, this.capacity),
        lastRefill: Number(value.lastRefill) || now,
      },
      version: null,
    };
  }

  async _writeState(key, state, version) {
    const payload = JSON.stringify({
      tokens: state.tokens,
      lastRefill: state.lastRefill,
    });

    if (typeof this.kv?.cas === 'function') {
      return this.kv.cas(key, payload, {
        expirationTtl: this.ttlSeconds,
        expectedVersion: version,
      });
    }

    await this.kv.put(key, payload, {
      expirationTtl: this.ttlSeconds,
    });
    return true;
  }
}
