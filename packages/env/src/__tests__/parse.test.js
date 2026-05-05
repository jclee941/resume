import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';

import { validateEnv, EnvValidationError } from '../parse.js';

describe('@resume/env validateEnv', () => {
  const schema = z.object({
    REQUIRED_KEY: z.string().min(1),
    OPTIONAL_KEY: z.string().optional(),
    NUM_KEY: z.coerce.number().int().optional(),
    BOOL_KEY: z.enum(['true', 'false']).optional(),
  });

  it('returns parsed env when all required keys are present', () => {
    const env = validateEnv(schema, { REQUIRED_KEY: 'value' });
    assert.equal(env.REQUIRED_KEY, 'value');
  });

  it('coerces numeric strings via z.coerce.number', () => {
    const env = validateEnv(schema, { REQUIRED_KEY: 'v', NUM_KEY: '42' });
    assert.equal(env.NUM_KEY, 42);
  });

  it('preserves optional keys when present', () => {
    const env = validateEnv(schema, { REQUIRED_KEY: 'v', OPTIONAL_KEY: 'opt' });
    assert.equal(env.OPTIONAL_KEY, 'opt');
  });

  it('throws EnvValidationError on missing required key', () => {
    assert.throws(
      () => validateEnv(schema, {}, { appName: 'test-app' }),
      (err) => {
        assert.ok(err instanceof EnvValidationError);
        assert.match(err.message, /Invalid environment for "test-app"/);
        assert.match(err.message, /REQUIRED_KEY/);
        assert.equal(err.appName, 'test-app');
        assert.ok(Array.isArray(err.issues));
        assert.ok(err.issues.length >= 1);
        return true;
      }
    );
  });

  it('throws EnvValidationError on invalid type', () => {
    assert.throws(
      () => validateEnv(schema, { REQUIRED_KEY: 'v', BOOL_KEY: 'yes' }, { appName: 'test' }),
      EnvValidationError
    );
  });

  it('throws TypeError when schema lacks safeParse', () => {
    assert.throws(() => validateEnv({}, {}), TypeError);
    assert.throws(() => validateEnv(null, {}), TypeError);
  });

  it('throws TypeError when source is not an object', () => {
    assert.throws(() => validateEnv(schema, null), TypeError);
    assert.throws(() => validateEnv(schema, 'string'), TypeError);
    assert.throws(() => validateEnv(schema, undefined), TypeError);
  });

  it('uses default appName "app" when not provided', () => {
    try {
      validateEnv(schema, {});
      assert.fail('expected throw');
    } catch (err) {
      assert.match(err.message, /Invalid environment for "app"/);
    }
  });

  it('error message lists every missing/invalid path on a separate line', () => {
    const multi = z.object({
      A: z.string().min(1),
      B: z.string().min(1),
      C: z.string().min(1),
    });
    try {
      validateEnv(multi, {}, { appName: 'multi' });
      assert.fail('expected throw');
    } catch (err) {
      const lines = err.message.split('\n');
      // header + 3 paths
      assert.ok(lines.length >= 4);
      assert.ok(lines.some((l) => l.includes('A')));
      assert.ok(lines.some((l) => l.includes('B')));
      assert.ok(lines.some((l) => l.includes('C')));
    }
  });
});
