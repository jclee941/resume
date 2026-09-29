import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getConfig, getTodayApplicationCount } from '../db-helpers.js';
import { isCompanyAlreadyApplied } from '../duplicate-company.js';
import { getAutoApplyStatus } from '../status-handler.js';

function createDb({ appliedCompany = null, pendingApprovals = 0 } = {}) {
  const queries = [];
  return {
    queries,
    prepare(sql) {
      queries.push(sql);
      return {
        params: /** @type {unknown[]} */ ([]),
        bind(...params) {
          this.params = params;
          return this;
        },
        async first() {
          if (sql.includes('lower(trim(company)) = lower(?)')) {
            return this.params[0] === appliedCompany ? { id: 'app-1' } : null;
          }
          if (sql.includes('FROM approval_requests')) return { count: pendingApprovals };
          if (sql.includes('COUNT(*)')) return { count: 0 };
          return null;
        },
        async all() {
          return { results: [] };
        },
      };
    },
  };
}

describe('dashboard data access targets JOB_DB', () => {
  it('finds a company applied in JOB_DB when the portfolio DB is also bound', async () => {
    const env = { DB: createDb(), JOB_DB: createDb({ appliedCompany: 'Acme' }) };

    assert.equal(await isCompanyAlreadyApplied(env, 'Acme'), true);
  });

  it('counts pending approvals from JOB_DB', async () => {
    const env = {
      DB: createDb({ pendingApprovals: 9 }),
      JOB_DB: createDb({ pendingApprovals: 2 }),
    };

    const status = await (await getAutoApplyStatus(env)).json();

    assert.equal(status.pendingApprovals, 2);
  });

  it('never queries the portfolio DB binding', async () => {
    const portfolioDb = createDb({ appliedCompany: 'Acme', pendingApprovals: 5 });
    const env = { DB: portfolioDb };

    assert.equal(await isCompanyAlreadyApplied(env, 'Acme'), false);
    await getConfig(env);
    await getTodayApplicationCount(env);
    await getAutoApplyStatus(env);

    assert.deepEqual(portfolioDb.queries, []);
  });
});
