import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getValidatedEnv, EnvValidationError } from '../env.js';

describe('job-dashboard utils/env', () => {
  it('throws when rawEnv is null/undefined', () => {
    assert.throws(() => getValidatedEnv(null), TypeError);
    assert.throws(() => getValidatedEnv(undefined), TypeError);
  });

  it('throws when rawEnv is a string/number', () => {
    assert.throws(() => getValidatedEnv('env'), TypeError);
    assert.throws(() => getValidatedEnv(42), TypeError);
  });

  it('throws EnvValidationError when ENCRYPTION_KEY is missing', () => {
    assert.throws(
      () => getValidatedEnv({}),
      (err) => {
        assert.ok(err instanceof EnvValidationError);
        assert.match(err.message, /ENCRYPTION_KEY/);
        assert.equal(err.appName, 'job-dashboard');
        return true;
      }
    );
  });

  it('returns the validated env on success', () => {
    const env = getValidatedEnv({ ENCRYPTION_KEY: 'k' });
    assert.equal(env.ENCRYPTION_KEY, 'k');
  });

  it('memoizes per-rawEnv reference (same object → same validated result)', () => {
    const raw = { ENCRYPTION_KEY: 'k' };
    const v1 = getValidatedEnv(raw);
    const v2 = getValidatedEnv(raw);
    assert.strictEqual(v1, v2); // identity equality, not just structural
  });

  it('does NOT memoize across different rawEnv references', () => {
    const a = { ENCRYPTION_KEY: 'k1' };
    const b = { ENCRYPTION_KEY: 'k2' };
    const va = getValidatedEnv(a);
    const vb = getValidatedEnv(b);
    assert.notStrictEqual(va, vb);
    assert.equal(va.ENCRYPTION_KEY, 'k1');
    assert.equal(vb.ENCRYPTION_KEY, 'k2');
  });
});
