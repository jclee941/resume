import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parsePeriod, normalizePhone, computeDiff } from '../utils.js';

describe('parsePeriod', () => {
  it('handles tilde separator (2024.03 ~ 2025.02)', () => {
    const result = parsePeriod('2024.03 ~ 2025.02');
    assert.deepStrictEqual(result, { startsAt: '2024-03-01', endsAt: '2025-02-01' });
  });

  it('handles dash separator (2014.12 - 2016.12)', () => {
    const result = parsePeriod('2014.12 - 2016.12');
    assert.deepStrictEqual(result, { startsAt: '2014-12-01', endsAt: '2016-12-01' });
  });

  it('handles 현재 as end date with tilde', () => {
    const result = parsePeriod('2025.03 ~ 현재');
    assert.deepStrictEqual(result, { startsAt: '2025-03-01', endsAt: null });
  });

  it('handles 현재 as end date with dash', () => {
    const result = parsePeriod('2025.03 - 현재');
    assert.deepStrictEqual(result, { startsAt: '2025-03-01', endsAt: null });
  });

  it('handles SSOT military period format', () => {
    // Real SSOT data: military.period = "2014.12 - 2016.12"
    const result = parsePeriod('2014.12 - 2016.12');
    assert.strictEqual(result.startsAt, '2014-12-01');
    assert.strictEqual(result.endsAt, '2016-12-01');
  });

  it('handles SSOT career period format', () => {
    // Real SSOT data: careers use "2020.07 ~ 2021.08"
    const result = parsePeriod('2020.07 ~ 2021.08');
    assert.strictEqual(result.startsAt, '2020-07-01');
    assert.strictEqual(result.endsAt, '2021-08-01');
  });

  it('returns empty startsAt for null input', () => {
    const result = parsePeriod(null);
    assert.deepStrictEqual(result, { startsAt: '', endsAt: null });
  });

  it('returns empty startsAt for undefined input', () => {
    const result = parsePeriod(undefined);
    assert.deepStrictEqual(result, { startsAt: '', endsAt: null });
  });

  it('returns empty startsAt for empty string', () => {
    const result = parsePeriod('');
    assert.deepStrictEqual(result, { startsAt: '', endsAt: null });
  });
});

describe('normalizePhone', () => {
  it('normalizes Korean phone number', () => {
    const result = normalizePhone('010-1234-5678');
    assert.ok(result, 'should return a normalized phone number');
  });

  it('returns empty string for empty input', () => {
    const result = normalizePhone('');
    assert.strictEqual(result, '');
  });

  it('returns empty string for undefined', () => {
    const result = normalizePhone(undefined);
    assert.strictEqual(result, '');
  });
});

describe('computeDiff', () => {
  it('returns empty array for identical objects', () => {
    const current = { name: 'Lee', title: 'Engineer' };
    const target = { name: 'Lee', title: 'Engineer' };
    assert.deepStrictEqual(computeDiff(current, target), []);
  });

  it('detects changed fields', () => {
    const current = { name: 'Lee', title: 'Junior' };
    const target = { name: 'Lee', title: 'Senior' };
    const diff = computeDiff(current, target);
    assert.strictEqual(diff.length, 1);
    assert.strictEqual(diff[0].field, 'title');
    assert.strictEqual(diff[0].from, 'Junior');
    assert.strictEqual(diff[0].to, 'Senior');
  });

  it('detects new fields in target', () => {
    const current = { name: 'Lee' };
    const target = { name: 'Lee', email: 'test@test.com' };
    const diff = computeDiff(current, target);
    assert.strictEqual(diff.length, 1);
    assert.strictEqual(diff[0].field, 'email');
  });
});
