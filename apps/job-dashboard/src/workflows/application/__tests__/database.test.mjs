import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

import { createApprovalRequest, getDailyApplicationCount } from '../database.js';

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

const created = '2026-11-09T12:00:00Z';
const applied = '2026-11-09T10:00:00Z';
const dailyCases = [
  {
    name: 'actual applications after previews and imports',
    rows: [
      ...Array.from({ length: 30 }, () => ['wanted', 'pending', null, created]),
      ['wanted', 'applied', applied, created],
      ['wanted', 'applied', applied, created],
      ['remember', 'viewed', applied, created],
      ...Array.from({ length: 4 }, () => ['wanted', 'applied', '2026-10-01', created]),
    ],
    expected: 3,
  },
  {
    name: 'null application timestamp',
    rows: [['wanted', 'applied', null, created]],
    expected: 0,
  },
  {
    name: 'UTC boundaries including timezone offsets',
    rows: [
      '2026-11-08T23:59:59Z',
      '2026-11-09T00:00:00Z',
      '2026-11-09T23:59:59Z',
      '2026-11-10T00:00:00Z',
      '2026-11-09T00:00:00+09:00',
      '2026-11-10T08:59:59+09:00',
      '2026-11-08T19:00:00-05:00',
      '2026-11-09T19:00:00-05:00',
    ].map((timestamp) => ['wanted', 'applied', timestamp, '2026-11-08T12:00:00Z']),
    expected: 4,
  },
];

for (const { name, rows, expected } of dailyCases) {
  test(`Workflow daily counter counts ${name} with SQLite`, async () => {
    const sqlite = new DatabaseSync(':memory:');
    try {
      sqlite.exec(
        'CREATE TABLE applications (source TEXT, status TEXT, applied_at TEXT, created_at TEXT)'
      );
      const insert = sqlite.prepare('INSERT INTO applications VALUES (?, ?, ?, ?)');
      for (const row of rows) insert.run(...row);
      const ctx = {
        env: {
          JOB_DB: {
            prepare(sql) {
              return {
                bind(...params) {
                  return { first: async () => sqlite.prepare(sql).get(...params) };
                },
              };
            },
          },
        },
      };

      const count = await getDailyApplicationCount(ctx, '2026-11-09');

      assert.equal(count, expected);
      assert.equal(Math.max(0, 30 - count), 30 - expected);
    } finally {
      sqlite.close();
    }
  });
}
