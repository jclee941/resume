import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { createAutoApplyClients } from '../client-factory.js';
import { isCompanyAlreadyApplied } from '../duplicate-company.js';
import { runAutoApply } from '../run-handler.js';

function createRequest(body) {
  return {
    async json() {
      return body;
    },
  };
}

function createD1WithExistingCompany(company) {
  const writes = [];

  return {
    writes,
    prepare(sql) {
      return {
        params: [],
        bind(...params) {
          this.params = params;
          return this;
        },
        async all() {
          if (sql.includes('SELECT key, value FROM config')) {
            return {
              results: [
                { key: 'auto_apply_enabled', value: 'true' },
                { key: 'max_daily_applications', value: '3' },
                { key: 'min_match_score', value: '70' },
                { key: 'auto_apply_keywords', value: JSON.stringify(['DevOps']) },
              ],
            };
          }
          return { results: [] };
        },
        async first() {
          if (sql.includes('DATE(created_at)')) {
            return { count: 0 };
          }
          if (sql.includes('job_id = ? AND source = ?')) {
            return null;
          }
          if (sql.includes('lower(trim(company)) = lower(?)')) {
            return this.params[0] === company ? { id: 'existing-app' } : null;
          }
          return null;
        },
        async run() {
          writes.push({ sql, params: this.params });
          return { meta: { changes: 1 } };
        },
      };
    },
  };
}

describe('auto-apply Cliproxy integration', () => {
  it('creates a Cliproxy client when Worker env contains Cliproxy secrets', () => {
    const clients = createAutoApplyClients({
      CLIPROXY_BASE: 'https://cliproxy.example.test/v1',
      CLIPROXY_API_KEY: 'test-key',
    });

    assert.equal(typeof clients.cliproxy.searchJobs, 'function');
  });

  it('skips a candidate when the company was already applied through another job id', async () => {
    const db = createD1WithExistingCompany('Existing Enterprise');
    const clients = {
      wanted: { setCookies: mock.fn(), searchJobs: mock.fn() },
      linkedin: {},
      remember: {},
    };

    const response = await runAutoApply({
      request: createRequest({
        dryRun: true,
        maxApplications: 1,
        platforms: ['wanted'],
        explicitCandidates: [
          {
            id: 'new-job-id',
            sourceId: 'new-job-id',
            source: 'wanted',
            company: 'Existing Enterprise',
            position: 'Platform Engineer',
            matchScore: 95,
            sourceUrl: 'https://www.wanted.co.kr/wd/new-job-id',
          },
        ],
      }),
      env: { DB: db },
      clients,
    });

    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.results.jobs[0].action, 'skipped_company_already_applied');
    assert.equal(db.writes.length, 0);
  });

  it('searches through a Cliproxy client and filters duplicate companies', async () => {
    const db = createD1WithExistingCompany('Existing Enterprise');
    const clients = {
      cliproxy: {
        searchJobs: mock.fn(async () => ({
          jobs: [
            {
              id: 'existing-job',
              sourceId: 'existing-job',
              source: 'cliproxy',
              company: 'Existing Enterprise',
              position: 'Platform Engineer',
              matchScore: 95,
              sourceUrl: 'https://jobs.example/existing',
            },
            {
              id: 'fresh-job',
              sourceId: 'fresh-job',
              source: 'cliproxy',
              company: 'Fresh Enterprise',
              position: 'Security Engineer',
              matchScore: 92,
              sourceUrl: 'https://jobs.example/fresh',
            },
          ],
        })),
      },
    };

    const response = await runAutoApply({
      request: createRequest({
        dryRun: true,
        maxApplications: 2,
        platforms: ['cliproxy'],
        keywords: ['security'],
      }),
      env: { DB: db },
      clients,
    });

    const data = await response.json();
    const actions = data.results.jobs.map((job) => job.action);

    assert.equal(response.status, 200);
    assert.equal(clients.cliproxy.searchJobs.mock.callCount(), 1);
    assert.deepEqual(actions, ['skipped_company_already_applied', 'would_apply']);
    assert.equal(db.writes.length, 1);
  });

  it('rejects non-dry-run Cliproxy runs before searching without explicit approval', async () => {
    const searchJobs = mock.fn(async () => ({ jobs: [] }));
    const response = await runAutoApply({
      request: createRequest({
        dryRun: false,
        platforms: ['cliproxy'],
        keywords: ['security'],
      }),
      env: { DB: createD1WithExistingCompany('Existing Enterprise') },
      clients: { cliproxy: { searchJobs } },
    });

    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(data.errorCode, 'REAL_SUBMIT_APPROVAL_REQUIRED');
    assert.equal(searchJobs.mock.callCount(), 0);
  });

  it('does not treat dry-run preview rows as blocking duplicate company evidence', async () => {
    const db = {
      prepare(sql) {
        return {
          bind() {
            return this;
          },
          async first() {
            assert.match(sql, /COALESCE\(auto_apply_dry_run, 0\) = 0/);
            assert.match(sql, /lower\(trim\(company\)\) = lower\(\?\)/);
            return null;
          },
        };
      },
    };

    assert.equal(await isCompanyAlreadyApplied({ DB: db }, 'Preview Enterprise'), false);
  });
});
