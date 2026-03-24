import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const BARREL_URL = new URL('../index.js', import.meta.url);

describe('session barrel', () => {
  let mod;
  it('loads without error', async () => {
    mod = await import(BARREL_URL);
  });
  it('exports SessionManager', () => {
    assert.equal(typeof mod.SessionManager, 'function');
  });
  it('exports default as SessionManager', () => {
    assert.equal(typeof mod.default, 'function');
  });
});
