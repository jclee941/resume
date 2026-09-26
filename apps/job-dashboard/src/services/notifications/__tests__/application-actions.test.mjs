import { test } from 'node:test';
import assert from 'node:assert/strict';

import { approveApplication, rejectApplication } from '../application-actions.js';

function serviceWithRows({ approvalRequests = [], applications = [] }) {
  const rows = {
    approval_requests: new Set(approvalRequests),
    applications: new Set(applications),
  };
  const writes = [];
  const db = {
    prepare(sql) {
      const table = sql.includes('approval_requests') ? 'approval_requests' : 'applications';
      return {
        bind(...args) {
          return {
            async run() {
              const id = args.at(-1);
              const changes = rows[table].has(id) ? 1 : 0;
              if (changes) writes.push({ table, status: args[0], id });
              return { meta: { changes } };
            },
          };
        },
      };
    },
  };
  return { service: { env: { JOB_DB: db } }, writes };
}

test('Telegram approve records the decision on the approval request the workflow polls', async () => {
  const { service, writes } = serviceWithRows({ approvalRequests: ['approval-wf-1-job-9'] });

  const result = await approveApplication(service, 'approval-wf-1-job-9');

  assert.equal(result.success, true);
  assert.deepEqual(writes, [
    { table: 'approval_requests', status: 'approved', id: 'approval-wf-1-job-9' },
  ]);
});

test('Telegram reject still updates legacy application ids', async () => {
  const { service, writes } = serviceWithRows({ applications: ['app-1'] });

  const result = await rejectApplication(service, 'app-1');

  assert.equal(result.success, true);
  assert.deepEqual(writes, [{ table: 'applications', status: 'rejected', id: 'app-1' }]);
});

test('Telegram approve reports unknown ids instead of claiming success', async () => {
  const { service, writes } = serviceWithRows({});

  const result = await approveApplication(service, 'missing');

  assert.equal(result.success, false);
  assert.deepEqual(writes, []);
});
