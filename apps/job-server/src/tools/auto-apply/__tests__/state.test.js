import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { AutoApplySessionState, createDefaultState, getSessionState } from '../state.js';

describe('AutoApplySessionState (issue #16 / P0-5 Slice C step 1)', () => {
  it('lazily initializes on first get()', () => {
    const s = new AutoApplySessionState();
    const state = s.get();
    assert.equal(state.jobsSearched, 0);
    assert.equal(state.jobsApplied, 0);
    assert.equal(state.preferences.matchScoreThreshold, 75);
    assert.deepEqual(state.preferences.preferredPlatforms, ['wanted']);
  });

  it('returns the same object reference across get() calls', () => {
    const s = new AutoApplySessionState();
    const a = s.get();
    const b = s.get();
    assert.strictEqual(a, b);
  });

  it('set() replaces state', () => {
    const s = new AutoApplySessionState();
    s.set({ custom: true });
    assert.deepEqual(s.get(), { custom: true });
  });

  it('reset() restores a fresh default state', () => {
    const s = new AutoApplySessionState();
    s.get().jobsApplied = 99;
    assert.equal(s.get().jobsApplied, 99);
    s.reset();
    assert.equal(s.get().jobsApplied, 0);
  });

  it('clear() drops state; next get() re-initializes', () => {
    const s = new AutoApplySessionState();
    s.get().jobsApplied = 5;
    s.clear();
    const fresh = s.get();
    assert.equal(fresh.jobsApplied, 0);
  });

  it('two instances are isolated (the whole point of Slice C)', () => {
    const a = new AutoApplySessionState();
    const b = new AutoApplySessionState();
    a.get().jobsApplied = 10;
    b.get().jobsApplied = 200;
    assert.equal(a.get().jobsApplied, 10);
    assert.equal(b.get().jobsApplied, 200);
  });

  it('createDefaultState() returns a fresh object each call', () => {
    const a = createDefaultState();
    const b = createDefaultState();
    assert.notStrictEqual(a, b);
    assert.notStrictEqual(a.applications, b.applications);
  });

  it('getSessionState() singleton API still works', () => {
    const s = getSessionState();
    assert.equal(typeof s, 'object');
    assert.equal(typeof s.jobsSearched, 'number');
  });
});
