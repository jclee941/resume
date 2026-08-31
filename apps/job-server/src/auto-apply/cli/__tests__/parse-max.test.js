import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseMaxArgument } from '../parse-max.js';

describe('parseMaxArgument', () => {
  it('preserves each caller fallback when --max is absent', () => {
    assert.equal(parseMaxArgument([], 5), 5);
    assert.equal(parseMaxArgument([], 3), 3);
    assert.equal(parseMaxArgument([]), undefined);
  });

  it('preserves zero and parses positive integers', () => {
    assert.equal(parseMaxArgument(['--max=0'], 5), 0);
    assert.equal(parseMaxArgument(['--max=12'], 3), 12);
  });

  for (const args of [
    ['--max=100', '--max=1'],
    ['--max=1', '--max=100'],
  ]) {
    it(`rejects duplicate max arguments in order ${args.join(' ')}`, () => {
      assert.throws(
        () => parseMaxArgument(args, 5),
        /--max must be a non-negative safe integer/
      );
    });
  }

  for (const value of ['-1', '1.5', '', 'jobs', '1e2', '9007199254740992']) {
    it(`rejects invalid --max=${value}`, () => {
      assert.throws(
        () => parseMaxArgument([`--max=${value}`], 5),
        /--max must be a non-negative safe integer/
      );
    });
  }
});
