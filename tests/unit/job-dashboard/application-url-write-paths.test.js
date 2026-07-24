const assert = require('node:assert/strict');
const path = require('node:path');
const test = globalThis.test || require('node:test');

const rawUrl = 'https://jobs.example/opening?utm_source=mail&role=platform#details';
const canonicalUrl = 'https://jobs.example/opening?role=platform';

function createCapturingDb() {
  const queries = [];
  return {
    queries,
    prepare(sql) {
      return {
        bind(...params) {
          return {
            async run() {
              queries.push({ params, sql });
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
  };
}

function createPreCanonicalDb() {
  const queries = [];
  return {
    queries,
    prepare(sql) {
      return {
        bind(...params) {
          return {
            async run() {
              queries.push({ params, sql });
              if (sql.includes('canonical_url')) {
                throw new Error('no such column: canonical_url');
              }
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
  };
}

function applicationInsert(db) {
  return db.queries.find(({ sql }) => sql.includes('INTO applications'));
}

test('stores raw and canonical URLs when importing direct Wanted search results', async () => {
  const { JobSearchHandler } = await import(
    path.join(__dirname, '../../../apps/job-dashboard/src/handlers/job-search-handler.js')
  );
  const db = createCapturingDb();
  const handler = new JobSearchHandler({ DB: db });
  handler.fetchWantedJobs = async () => [
    { id: '42', company: 'Example', position: 'Platform Engineer' },
  ];

  await handler.triggerJobSearch({ json: async () => ({ keywords: ['Platform'] }) });

  const statement = applicationInsert(db);
  assert.match(statement.sql, /source_url,\s+canonical_url/);
  assert.deepEqual(statement.params.slice(3, 5), [
    'https://www.wanted.co.kr/wd/42',
    'https://www.wanted.co.kr/wd/42',
  ]);
});

test('stores raw and canonical URLs when syncing Wanted application history', async () => {
  const { WantedHistoryRepository } = await import(
    path.join(
      __dirname,
      '../../../apps/job-dashboard/src/handlers/applications/wanted-history-repository.js'
    )
  );
  const db = createCapturingDb();
  const repository = new WantedHistoryRepository(db);

  await repository.upsertApplication({
    id: 'wanted-42',
    wantedApplicationId: '42',
    wantedJobId: 'opening-42',
    sourceUrl: rawUrl,
    position: 'Platform Engineer',
    company: 'Example',
    status: 'applied',
    resumeId: null,
    appliedAt: '2026-07-23T00:00:00.000Z',
    updatedAt: '2026-07-23T00:00:00.000Z',
  });

  const statement = applicationInsert(db);
  assert.match(statement.sql, /source_url,\s+canonical_url/);
  assert.deepEqual(statement.params.slice(2, 4), [rawUrl, canonicalUrl]);
});

test('stores raw and canonical URLs for auto-apply application records', async () => {
  const { recordApplication } = await import(
    path.join(__dirname, '../../../apps/job-dashboard/src/handlers/auto-apply/db-helpers.js')
  );
  const db = createCapturingDb();

  await recordApplication(
    { DB: db },
    {
      job: { id: '42', sourceUrl: rawUrl, position: 'Platform Engineer', company: 'Example' },
      source: 'wanted',
      status: 'saved',
    }
  );

  const statement = applicationInsert(db);
  assert.match(statement.sql, /source_url,\s+canonical_url/);
  assert.deepEqual(statement.params.slice(3, 5), [rawUrl, canonicalUrl]);
});

test('falls back to the pre-0009 application schema without canonical URLs', async () => {
  const { recordApplication } = await import(
    path.join(__dirname, '../../../apps/job-dashboard/src/handlers/auto-apply/db-helpers.js')
  );
  const db = createPreCanonicalDb();

  await recordApplication(
    { DB: db },
    {
      job: { id: '42', sourceUrl: rawUrl, position: 'Platform Engineer', company: 'Example' },
      source: 'wanted',
      status: 'saved',
    }
  );

  assert.equal(db.queries.length, 3);
  assert.equal(db.queries[2].sql.includes('canonical_url'), false);
  assert.equal(db.queries[2].params[3], rawUrl);
});

test('stores raw and canonical URLs for submitted workflow applications', async () => {
  const { recordApplication } = await import(
    path.join(__dirname, '../../../apps/job-dashboard/src/workflows/application/database.js')
  );
  const db = createCapturingDb();

  await recordApplication(
    { env: { JOB_DB: db } },
    {
      workflowId: 'workflow-1',
      jobId: '42',
      platform: 'wanted',
      sourceUrl: rawUrl,
      company: 'Example',
      position: 'Platform Engineer',
      resumeId: 'resume-1',
      coverLetter: 'Hello',
      matchScore: 85,
    }
  );

  const statement = applicationInsert(db);
  assert.match(statement.sql, /source_url,\s+canonical_url/);
  assert.ok(statement.params.includes(rawUrl));
  assert.ok(statement.params.includes(canonicalUrl));
});

test('derives raw and canonical URLs for ATS application records', async () => {
  const { recordAtsApplication } = await import(
    path.join(
      __dirname,
      '../../../apps/job-dashboard/src/handlers/applications/ats-application-recorder.js'
    )
  );
  const recorded = [];
  const repository = {
    db: { prepare: () => ({ bind: () => ({ first: async () => null }) }) },
    insert: async (application) => {
      recorded.push(application);
      return application;
    },
  };

  await recordAtsApplication(repository, {
    source: 'greenhouse',
    externalJobId: '42',
    source_url: rawUrl,
    position: 'Platform Engineer',
    company: 'Example',
  });

  assert.deepEqual(
    { sourceUrl: recorded[0].sourceUrl, canonicalUrl: recorded[0].canonicalUrl },
    { sourceUrl: rawUrl, canonicalUrl }
  );
});
