import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const BARREL_URL = new URL('../index.js', import.meta.url);

describe('wanted barrel', () => {
  let mod;
  it('loads without error', async () => {
    mod = await import(BARREL_URL);
  });
  it('exports WantedAPI', () => {
    assert.equal(typeof mod.WantedAPI, 'function');
  });
  it('exports WantedAPIError', () => {
    assert.equal(typeof mod.WantedAPIError, 'function');
  });
  it('exports JOB_CATEGORIES', () => {
    assert.equal(typeof mod.JOB_CATEGORIES, 'object');
  });
  it('exports default as WantedAPIClass', () => {
    assert.equal(typeof mod.default, 'function');
  });
  it('exports HttpClient', () => {
    assert.equal(typeof mod.HttpClient, 'function');
  });
  it('exports normalizeJob', () => {
    assert.equal(typeof mod.normalizeJob, 'function');
  });
  it('exports normalizeJobDetail', () => {
    assert.equal(typeof mod.normalizeJobDetail, 'function');
  });
  it('exports normalizeCompany', () => {
    assert.equal(typeof mod.normalizeCompany, 'function');
  });
});
