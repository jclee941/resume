import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  formatYYYY_MM,
  formatYYYY_MM_DD,
  formatYYYYMM,
  parsePeriod,
} from '../date-formatters.js';

describe('date formatters', () => {
  it('formats dotted year-month as YYYYMM', () => {
    assert.strictEqual(formatYYYYMM('2024.03'), '202403');
  });

  it('formats dotted year-month as YYYY-MM', () => {
    assert.strictEqual(formatYYYY_MM('2024.03'), '2024-03');
  });

  it('formats dotted year-month as YYYY-MM-DD with first-day default', () => {
    assert.strictEqual(formatYYYY_MM_DD('2024.03'), '2024-03-01');
  });

  it('formats full dates without changing separators into target shape', () => {
    assert.strictEqual(formatYYYYMM('2024.03.15'), '202403');
    assert.strictEqual(formatYYYY_MM_DD('2024.03.15'), '2024-03-15');
  });

  it('formats Date instances with local calendar parts', () => {
    const date = new Date(2024, 2, 5);
    assert.strictEqual(formatYYYYMM(date), '202403');
    assert.strictEqual(formatYYYY_MM(date), '2024-03');
    assert.strictEqual(formatYYYY_MM_DD(date), '2024-03-05');
  });

  it('returns empty string for blank or invalid date input', () => {
    assert.strictEqual(formatYYYYMM(null), '');
    assert.strictEqual(formatYYYY_MM(undefined), '');
    assert.strictEqual(formatYYYY_MM_DD(''), '');
  });
});

describe('parsePeriod', () => {
  it('parses tilde periods into Wanted and JobKorea date formats', () => {
    assert.deepStrictEqual(parsePeriod('2024.03 ~ 2025.02'), {
      start: '202403',
      end: '202502',
      startsAt: '2024-03-01',
      endsAt: '2025-02-01',
      isCurrent: false,
    });
  });

  it('parses dashed periods into Wanted and JobKorea date formats', () => {
    assert.deepStrictEqual(parsePeriod('2014.12 - 2016.12'), {
      start: '201412',
      end: '201612',
      startsAt: '2014-12-01',
      endsAt: '2016-12-01',
      isCurrent: false,
    });
  });

  it('keeps current periods open-ended', () => {
    assert.deepStrictEqual(parsePeriod('2025.03 ~ 현재'), {
      start: '202503',
      end: '',
      startsAt: '2025-03-01',
      endsAt: null,
      isCurrent: true,
    });
  });

  it('returns empty dates for missing period input', () => {
    assert.deepStrictEqual(parsePeriod(null), {
      start: '',
      end: '',
      startsAt: '',
      endsAt: null,
      isCurrent: false,
    });
  });
});
