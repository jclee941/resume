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

  it('throws before API-only portfolio or save side effects when payload is incomplete', async () => {
    const calls = [];
    global.fetch = async (url) => {
      calls.push(String(url));
      return {
        ok: true,
        url: String(url),
        text: async () =>
          '<input name="IsEditPage" value="True"><input name="LastEditDateTicks" value="1">',
      };
    };

    await assert.rejects(
      () =>
        syncToJobKoreaAPI(
          {
            careers: [
              { company: 'A', period: '2024.01 ~ 2024.12' },
              { company: 'B', period: '2025.01 ~ 현재' },
            ],
            personal: { portfolio: 'https://portfolio.example.test' },
          },
          { cookieString: 'ACNT_COOKIE=test', logger: () => {} }
        ),
      /JobKorea Career payload fields are incomplete/
    );

    assert.strictEqual(calls.length, 1);
    assert.match(calls[0], /\/User\/Resume\/Edit/);
    assert.ok(!calls.some((url) => url.includes('/User/Resume/AddUserFileDB')));
    assert.ok(!calls.some((url) => url.includes('/User/Resume/Save')));
  });
});
