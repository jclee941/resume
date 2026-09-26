import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ApplicationsHandler } from '../applications/index.js';

function handlerWithPending(pendingChanges) {
  const statements = [];
  const db = {
    prepare(sql) {
      return {
        bind(...args) {
          statements.push({ sql, args });
          return { run: async () => ({ meta: { changes: pendingChanges } }) };
        },
      };
    },
  };
  return { handler: new ApplicationsHandler(db), statements };
}

test('approving a workflow decides its pending approval requests', async () => {
  const { handler, statements } = handlerWithPending(2);

  const response = await handler.decideWorkflowApprovals(
    { params: { instanceId: 'wf-1' } },
    'approved'
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, approved: true, updated: 2 });
  assert.match(statements[0].sql, /UPDATE approval_requests/);
  assert.deepEqual(statements[0].args, ['approved', 'api', 'wf-1']);
});

test('rejecting a workflow without pending approval requests returns 404', async () => {
  const { handler, statements } = handlerWithPending(0);

  const response = await handler.decideWorkflowApprovals(
    { params: { instanceId: 'wf-2' } },
    'rejected'
  );

  assert.equal(response.status, 404);
  assert.deepEqual(statements[0].args, ['rejected', 'api', 'wf-2']);
});
