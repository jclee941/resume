import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { createSqliteD1 } from '../../../services/application-history/__tests__/history-test-kit.js';
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

describe('auto-apply duplicate company handling', () => {
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
      env: { JOB_DB: db },
      clients,
    });

    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.results.jobs[0].action, 'skipped_company_already_applied');
    assert.equal(db.writes.length, 0);
  });

  it('searches a platform client and filters duplicate companies', async () => {
    const db = createD1WithExistingCompany('Existing Enterprise');
    const clients = {
      linkedin: {
        searchJobs: mock.fn(async () => ({
          jobs: [
            {
              id: 'existing-job',
              sourceId: 'existing-job',
              source: 'linkedin',
              company: 'Existing Enterprise',
              position: 'Platform Engineer',
              matchScore: 95,
              sourceUrl: 'https://jobs.example/existing',
            },
            {
              id: 'fresh-job',
              sourceId: 'fresh-job',
              source: 'linkedin',
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
        platforms: ['linkedin'],
        keywords: ['security'],
      }),
      env: { JOB_DB: db },
      clients,
    });

    const data = await response.json();
    const actions = data.results.jobs.map((job) => job.action);

    assert.equal(response.status, 200);
    assert.equal(clients.linkedin.searchJobs.mock.callCount(), 1);
    assert.deepEqual(actions, ['skipped_company_already_applied', 'would_apply']);
    assert.equal(db.writes.length, 1);
  });

  it('rejects non-dry-run runs before searching without explicit approval', async () => {
    const searchJobs = mock.fn(async () => ({ jobs: [] }));
    const response = await runAutoApply({
      request: createRequest({
        dryRun: false,
        platforms: ['linkedin'],
        keywords: ['security'],
      }),
      env: { JOB_DB: createD1WithExistingCompany('Existing Enterprise') },
      clients: { linkedin: { searchJobs } },
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

    assert.equal(await isCompanyAlreadyApplied({ JOB_DB: db }, 'Preview Enterprise'), false);
  });

  it('blocks a company for its real applications but not for a saved posting', async () => {
    const db = createSqliteD1();
    const insert = db.sqlite.prepare(
      `INSERT INTO applications (id, job_id, source, position, company, status, created_at, updated_at)
       VALUES (?, ?, 'wanted', 'Role', ?, ?, '2026-10-01', '2026-10-01')`
    );
    insert.run('1', 'wanted-1', 'Saved Co', 'saved');
    insert.run('2', 'wanted-2', 'Rejected Co', 'rejected');

    assert.equal(await isCompanyAlreadyApplied({ JOB_DB: db }, 'Saved Co'), false);
    assert.equal(await isCompanyAlreadyApplied({ JOB_DB: db }, 'Rejected Co'), true);
  });
});
