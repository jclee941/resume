import assert from 'node:assert';
import { afterEach, describe, it } from 'node:test';
import {
  assertJobKoreaCareerPayloadCoverage,
  assertJobKoreaCareerSlotCoverage,
  selectJobKoreaCareerSectionIndices,
} from '../jobkorea-handler/career-guards.js';
import { syncToJobKoreaAPI } from '../jobkorea-handler/sync-api-only.js';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe('JobKorea career reset guard', () => {
  it('throws before save when apply mode has fewer Career slots than SSoT careers', () => {
    const ssot = {
      careers: [
        { company: 'A' },
        { company: 'B' },
        { company: 'C' },
      ],
    };
    const sectionIndices = { career: ['c7'] };

    assert.throws(
      () => assertJobKoreaCareerSlotCoverage(ssot, sectionIndices, { dryRun: false }),
      (error) => {
        assert.strictEqual(error.failLoud, true);
        assert.match(error.message, /JobKorea Career slots are incomplete/);
        assert.match(error.message, /expected=3/);
        assert.match(error.message, /actual=1/);
        return true;
      }
    );
  });

  it('allows dry-run comparison when Career slots are incomplete', () => {
    assert.doesNotThrow(() =>
      assertJobKoreaCareerSlotCoverage({ careers: [{ company: 'A' }] }, { career: [] }, {
        dryRun: true,
      })
    );
  });

  it('throws before API-only save when payload has fewer Career names than SSoT careers', () => {
    const ssot = { careers: [{ company: 'A' }, { company: 'B' }] };
    const fields = [{ name: 'Career[c1].C_Name', value: 'A' }];

    assert.throws(
      () => assertJobKoreaCareerPayloadCoverage(ssot, fields, { dryRun: false }),
      (error) => {
        assert.strictEqual(error.failLoud, true);
        assert.match(error.message, /JobKorea Career payload fields are incomplete/);
        assert.match(error.message, /expected=2/);
        assert.match(error.message, /actual=1/);
        return true;
      }
    );
  });

  it('allows API-only save when payload has every SSoT career name', () => {
    const ssot = { careers: [{ company: 'A' }, { company: 'B' }] };
    const fields = [
      { name: 'Career[c1].C_Name', value: 'A' },
      { name: 'Career[c2].C_Name', value: 'B' },
    ];

    assert.doesNotThrow(() =>
      assertJobKoreaCareerPayloadCoverage(ssot, fields, { dryRun: false })
    );
  });

  it('trims surplus live Career slots for apply saves', () => {
    const ssot = { careers: [{ company: 'A' }, { company: 'B' }] };
    const sectionIndices = { career: ['c7', 'c8', 'c9'], license: ['l1'] };

    const selected = selectJobKoreaCareerSectionIndices(ssot, sectionIndices, { dryRun: false });

    assert.deepStrictEqual(selected.career, ['c7', 'c8']);
    assert.deepStrictEqual(selected.license, ['l1']);
    assert.deepStrictEqual(sectionIndices.career, ['c7', 'c8', 'c9']);
  });

  it('saves every SSoT career through API-only template overlay', async () => {
    const calls = [];
    let saveBody = '';
    global.fetch = async (url, options = {}) => {
      calls.push({ url: String(url), body: String(options.body ?? '') });
      if (String(url).includes('/User/Resume/Save')) {
        saveBody = String(options.body ?? '');
        return {
          ok: true,
          status: 200,
          url: String(url),
          text: async () => JSON.stringify({ saveResult: { IsSuccess: true } }),
        };
      }

      return {
        ok: true,
        status: 200,
        url: String(url),
        text: async () =>
          '<input name="IsEditPage" value="True"><input name="LastEditDateTicks" value="1">',
      };
    };

    const result = await syncToJobKoreaAPI(
      {
        careers: [
          { company: 'A', period: '2024.01 ~ 2024.12' },
          { company: 'B', period: '2025.01 ~ 현재' },
        ],
      },
      { cookieString: 'ACNT_COOKIE=test', logger: () => {} }
    );

    const payload = new URLSearchParams(saveBody);
    assert.strictEqual(result.success, true);
    assert.strictEqual(calls.length, 2);
    assert.match(calls[0].url, /\/User\/Resume\/Edit/);
    assert.match(calls[1].url, /\/User\/Resume\/Save/);
    assert.deepStrictEqual(payload.getAll('Career.index'), ['c1', 'c2']);
    assert.strictEqual(payload.get('Career[c1].C_Name'), 'A');
    assert.strictEqual(payload.get('Career[c2].C_Name'), 'B');
  });
});
