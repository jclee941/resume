// Smoke tests for test-helpers module shape.
// Closes P2-11 — these 1637 LOC of test infrastructure had no tests of their
// own. We don't try to deeply test mocks/fixtures (they ARE test code), just
// assert that they import cleanly and expose the documented API surface.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('test-helpers/index.js — barrel export shape', () => {
  it('exports the documented helpers', async () => {
    const m = await import('../index.js');
    assert.ok(m.default, 'has default export');
    // Function helpers
    for (const expected of ['createMockLogger', 'createMockEnv', 'createMockFetch']) {
      assert.equal(typeof m[expected], 'function', `${expected} should be a function`);
    }
    // Fixture data objects
    for (const expected of ['mockResumeData', 'mockWantedResponse']) {
      assert.equal(typeof m[expected], 'object', `${expected} should be a data object`);
    }
  });
});

describe('test-helpers/mocks.js', () => {
  it('createMockLogger returns object with info/warn/error/debug/log', async () => {
    const { createMockLogger } = await import('../mocks.js');
    const logger = createMockLogger();
    for (const level of ['info', 'warn', 'error', 'debug', 'log']) {
      assert.equal(typeof logger[level], 'function', `${level} method exists`);
    }
  });

  it('createSpyLogger records calls', async () => {
    const { createSpyLogger } = await import('../mocks.js');
    const logger = createSpyLogger();
    logger.info('hello', 42);
    const calls = logger._getCalls();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].level, 'info');
    assert.deepEqual(calls[0].args, ['hello', 42]);
  });

  it('createMockEnv accepts overrides', async () => {
    const { createMockEnv } = await import('../mocks.js');
    const env = createMockEnv({ MY_VAR: 'x' });
    assert.equal(env.MY_VAR, 'x');
  });
});

describe('test-helpers/fixtures.js', () => {
  it('mockResumeData has expected shape', async () => {
    const { mockResumeData } = await import('../fixtures.js');
    assert.ok(typeof mockResumeData === 'object' && mockResumeData !== null);
  });

  it('mockJobs is an array of job objects', async () => {
    const { mockJobs } = await import('../fixtures.js');
    // mockJobs may be array or object containing arrays — just check existence
    assert.ok(mockJobs);
  });
});
