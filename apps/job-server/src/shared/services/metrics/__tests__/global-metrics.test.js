import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createGlobalMetrics } from '../global-metrics.js';

describe('global-metrics factory', () => {
  it('createGlobalMetrics() returns a NEW instance each call (DI factory contract)', () => {
    const a = createGlobalMetrics();
    const b = createGlobalMetrics();
    assert.notStrictEqual(a, b);
  });

  it('config arg is accepted by createGlobalMetrics()', () => {
    const m = createGlobalMetrics({ samplingIntervalMs: 999 });
    assert.notEqual(m, null);
    assert.equal(typeof m.stopSampling, 'function');
  });
});
