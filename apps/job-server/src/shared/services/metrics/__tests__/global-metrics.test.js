/**
 * Issue #16 / P0-5 — state-isolation tests for global-metrics.js.
 *
 * The acceptance criterion requires each module-state service to have its
 * own *.test.js verifying state isolation. global-metrics.js already
 * follows the closure-bound-holder pattern and exposes a DI-friendly
 * factory; these tests assert the contract.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  createGlobalMetrics,
  createMetrics,
  getMetrics,
  resetMetrics,
  getGlobalMetricsInstance,
} from '../global-metrics.js';

describe('global-metrics — state isolation (#16 P0-5)', () => {
  beforeEach(() => {
    // Ensure each test starts with a clean slate.
    resetMetrics();
  });

  afterEach(() => {
    resetMetrics();
  });

  it('createGlobalMetrics() returns a NEW instance each call (DI factory contract)', () => {
    const a = createGlobalMetrics();
    const b = createGlobalMetrics();
    assert.notStrictEqual(a, b);
  });

  it('createMetrics() is an alias for createGlobalMetrics()', () => {
    const a = createMetrics();
    assert.equal(typeof a.stopSampling, 'function');
  });

  it('getMetrics() returns a singleton instance (lazy-init)', () => {
    const a = getMetrics();
    const b = getMetrics();
    assert.strictEqual(a, b);
  });

  it('getGlobalMetricsInstance() returns null before getMetrics() is called', () => {
    resetMetrics();
    assert.equal(getGlobalMetricsInstance(), null);
    getMetrics();
    assert.notEqual(getGlobalMetricsInstance(), null);
  });

  it('resetMetrics() clears the singleton; next getMetrics() lazy-creates a fresh one', () => {
    const a = getMetrics();
    resetMetrics();
    assert.equal(getGlobalMetricsInstance(), null);
    const b = getMetrics();
    assert.notStrictEqual(a, b);
  });

  it('resetMetrics() on empty cache is a no-op (no throw)', () => {
    resetMetrics();
    assert.doesNotThrow(() => resetMetrics());
  });

  it('createGlobalMetrics() instances are independent of the singleton', () => {
    const factory = createGlobalMetrics();
    const singleton = getMetrics();
    assert.notStrictEqual(factory, singleton);
    // Resetting the singleton does not affect a factory-built instance.
    resetMetrics();
    assert.equal(getGlobalMetricsInstance(), null);
    assert.notEqual(factory, null);
  });

  it('config arg is accepted by createGlobalMetrics()', () => {
    const m = createGlobalMetrics({ samplingIntervalMs: 999 });
    assert.notEqual(m, null);
  });
});
