import assert from 'node:assert/strict';
import test from 'node:test';

import { createApprovalRequest } from '../database.js';

test('createApprovalRequest propagates migration errors without runtime DDL', async () => {
  // Given
  const queries = [];
  const missingColumn = new Error(
    'D1_ERROR: table approval_requests has no column named approval_metadata'
  );
  const ctx = {
    env: {
      JOB_DB: {
        prepare(query) {
          queries.push(query);
          const run = async () => {
            if (/ALTER TABLE/i.test(query)) return { success: true };
            throw new Error(`unexpected direct run: ${query}`);
          };
          return {
            run,
            bind() {
              return {
                async run() {
                  if (/INSERT INTO approval_requests/.test(query)) throw missingColumn;
                  if (/ALTER TABLE/i.test(query)) return { success: true };
                  throw new Error(`unexpected query: ${query}`);
                },
              };
            },
          };
        },
      },
    },
  };
  const job = {
    id: 'job-42',
    position: 'Security Engineer',
    company: 'Example',
    source: 'greenhouse',
  };

  // When
  await assert.rejects(
    createApprovalRequest(ctx, 'workflow-1', job, 'pending', 82, { source: 'greenhouse' }),
    missingColumn
  );

  // Then
  assert.equal(
    queries.some((query) => /ALTER TABLE/i.test(query)),
    false
  );
});
