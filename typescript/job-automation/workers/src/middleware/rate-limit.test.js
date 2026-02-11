import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRateLimit } from './rate-limit.js';

class MemoryKv {
  constructor() {
    this.store = new Map();
  }

  async get(key, options = {}) {
    const value = this.store.get(key);
    if (value === undefined) {
      return null;
    }
    if (options.type === 'json') {
      return JSON.parse(value);
    }
    return value;
  }

  async put(key, value) {
    this.store.set(key, value);
  }
}

function requestFor(pathname, ip = '198.51.100.10') {
  return new Request(`https://resume.jclee.me${pathname}`, {
    headers: {
      'cf-connecting-ip': ip,
    },
  });
}

test('rate limit warns on first overflow and blocks next overflow', async () => {
  const env = { RATE_LIMIT_KV: new MemoryKv() };
  const pathname = '/api/auth/login';

  for (let i = 0; i < 10; i++) {
    const result = await checkRateLimit(requestFor(pathname), pathname, env);
    assert.equal(result.ok, true);
  }

  const firstOverflow = await checkRateLimit(requestFor(pathname), pathname, env);
  assert.equal(firstOverflow.ok, true);
  assert.equal(firstOverflow.headers['X-RateLimit-Warn'], 'true');
  assert.equal(firstOverflow.headers['X-RateLimit-Violation'], '1');

  const secondOverflow = await checkRateLimit(requestFor(pathname), pathname, env);
  assert.equal(secondOverflow.ok, false);
  assert.equal(secondOverflow.status, 429);
  assert.equal(secondOverflow.headers['X-RateLimit-Violation'], '2');
});

test('rate limit enters temporary block on third overflow', async () => {
  const env = { RATE_LIMIT_KV: new MemoryKv() };
  const pathname = '/api/auth/login';

  for (let i = 0; i < 13; i++) {
    await checkRateLimit(requestFor(pathname, '203.0.113.8'), pathname, env);
  }

  const blocked = await checkRateLimit(requestFor(pathname, '203.0.113.8'), pathname, env);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers['X-RateLimit-Blocked'], 'true');
  assert.equal(blocked.headers['X-RateLimit-Violation'], '3');
});
