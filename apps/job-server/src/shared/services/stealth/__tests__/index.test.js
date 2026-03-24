import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const BARREL_URL = new URL('../index.js', import.meta.url);

describe('stealth barrel', () => {
  let mod;
  it('loads without error', async () => {
    mod = await import(BARREL_URL);
  });
  it('exports HumanizedTimer', () => {
    assert.equal(typeof mod.HumanizedTimer, 'function');
  });
  it('exports randomDelay', () => {
    assert.equal(typeof mod.randomDelay, 'function');
  });
  it('exports ProxyRotator', () => {
    assert.equal(typeof mod.ProxyRotator, 'function');
  });
  it('exports CookieJar', () => {
    assert.equal(typeof mod.CookieJar, 'function');
  });
  it('exports CaptchaDetector', () => {
    assert.equal(typeof mod.CaptchaDetector, 'function');
  });
});
