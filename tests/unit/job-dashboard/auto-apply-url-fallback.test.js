const assert = require('node:assert/strict');
const path = require('node:path');
const test = globalThis.test || require('node:test');

test('retains canonical URLs when only auto-apply metadata columns are missing', async () => {
  const { recordApplication } = await import(
    path.join(__dirname, '../../../apps/job-dashboard/src/handlers/auto-apply/db-helpers.js')
  );
  const queries = [];
  const db = {
    prepare(sql) {
      return {
        bind(...params) {
          return {
            async run() {
              queries.push({ params, sql });
              if (sql.includes('auto_apply_run_id')) {
                throw new Error('no such column: auto_apply_run_id');
              }
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
  };

  await recordApplication(
    { DB: db },
    {
      job: {
        id: '42',
        sourceUrl: 'https://jobs.example/opening?utm_source=mail&role=platform#details',
        position: 'Platform Engineer',
        company: 'Example',
      },
      source: 'wanted',
      status: 'saved',
    }
  );

  assert.equal(queries.length, 2);
  assert.match(queries[1].sql, /source_url, canonical_url/);
  assert.deepEqual(queries[1].params.slice(3, 5), [
    'https://jobs.example/opening?utm_source=mail&role=platform#details',
    'https://jobs.example/opening?role=platform',
  ]);
});
