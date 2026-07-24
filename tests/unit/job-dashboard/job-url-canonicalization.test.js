const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const test = globalThis.test || require('node:test');

const schemaPath = path.join(__dirname, '../../../apps/job-dashboard/schema.sql');
const helperModulePromise = import(
  path.join(__dirname, '../../../apps/job-dashboard/src/job-url-canonicalization.js')
);
const storageModulePromise = import(
  path.join(__dirname, '../../../apps/job-dashboard/src/workflows/job-crawling/job-storage.js')
);
const handlerModulePromise = import(
  path.join(__dirname, '../../../apps/job-dashboard/src/handlers/applications/index.js')
);

function createD1Adapter(database) {
  return {
    prepare(sql) {
      return {
        bind(...parameters) {
          return {
            run() {
              return database.prepare(sql).run(...parameters);
            },
            first() {
              return database.prepare(sql).get(...parameters) || null;
            },
          };
        },
      };
    },
    async batch(statements) {
      return statements.map((statement) => statement.run());
    },
  };
}

function createApplicationRequest(sourceUrl) {
  return {
    async json() {
      return {
        job: {
          id: 'wanted-application-1',
          source: 'wanted',
          sourceUrl,
          position: 'Platform Engineer',
          company: 'Example Corp',
          location: 'Seoul',
        },
      };
    },
  };
}

test('canonicalizes tracking URLs for persistence', async () => {
  const [{ canonicalizeJobUrl }, { saveMatchedJobs }, { ApplicationsHandler }] = await Promise.all([
    helperModulePromise,
    storageModulePromise,
    handlerModulePromise,
  ]);
  const rawUrl = 'https://jobs.example/opening?utm_source=mail&role=platform&gclid=abc#details';
  const canonicalUrl = 'https://jobs.example/opening?role=platform';
  const database = new DatabaseSync(':memory:');

  try {
    database.exec(readFileSync(schemaPath, 'utf8'));
    const env = { JOB_DB: createD1Adapter(database) };

    assert.equal(canonicalizeJobUrl(rawUrl), canonicalUrl);
    await saveMatchedJobs(env, [
      {
        id: 'wanted-discovery-1',
        source: 'wanted',
        sourceUrl: rawUrl,
        position: 'Platform Engineer',
        company: 'Example Corp',
      },
    ]);
    const handler = new ApplicationsHandler(env.JOB_DB);
    const response = await handler.create(createApplicationRequest(rawUrl));

    assert.equal(response.status, 201);
    assert.deepEqual(
      {
        ...database
          .prepare(
            'SELECT source_url, canonical_url FROM job_search_results WHERE id = ?'
          )
          .get('wanted-discovery-1'),
      },
      { source_url: rawUrl, canonical_url: canonicalUrl }
    );
    assert.deepEqual(
      { ...database.prepare('SELECT source_url, canonical_url FROM applications').get() },
      { source_url: rawUrl, canonical_url: canonicalUrl }
    );
  } finally {
    database.close();
  }
});

test('keeps malformed URLs raw', async () => {
  const [{ canonicalizeJobUrl }, { saveMatchedJobs }] = await Promise.all([
    helperModulePromise,
    storageModulePromise,
  ]);
  const rawUrl = 'javascript:alert(1)';
  const database = new DatabaseSync(':memory:');

  try {
    database.exec(readFileSync(schemaPath, 'utf8'));
    const env = { JOB_DB: createD1Adapter(database) };

    assert.equal(canonicalizeJobUrl(rawUrl), null);
    await saveMatchedJobs(env, [
      {
        id: 'wanted-discovery-2',
        source: 'wanted',
        sourceUrl: rawUrl,
        position: 'Security Engineer',
        company: 'Example Corp',
      },
    ]);
    assert.deepEqual(
      {
        ...database
          .prepare(
            'SELECT source_url, canonical_url FROM job_search_results WHERE id = ?'
          )
          .get('wanted-discovery-2'),
      },
      { source_url: rawUrl, canonical_url: null }
    );
  } finally {
    database.close();
  }
});

test('scrubs credentials and sensitive query parameters from canonical URLs', async () => {
  const { canonicalizeJobUrl } = await helperModulePromise;
  const rawUrl =
    'https://candidate:password@jobs.example/opening?access_token=token&api_key=secret&role=platform&sig=signature&utm_source=mail#details';

  assert.equal(canonicalizeJobUrl(rawUrl), 'https://jobs.example/opening?role=platform');
});

test('keeps discovery decisions separate from application status', async () => {
  const [{ saveMatchedJobs }, { ApplicationsHandler }] = await Promise.all([
    storageModulePromise,
    handlerModulePromise,
  ]);
  const database = new DatabaseSync(':memory:');

  try {
    database.exec(readFileSync(schemaPath, 'utf8'));
    const env = { JOB_DB: createD1Adapter(database) };
    const discoveryStatuses = ['new', 'dismissed', 'promoted'];
    await saveMatchedJobs(
      env,
      discoveryStatuses.map((discoveryStatus) => ({
        id: `wanted-discovery-${discoveryStatus}`,
        source: 'wanted',
        sourceUrl: 'https://jobs.example/promoted',
        position: 'Staff Engineer',
        company: 'Example Corp',
        discoveryStatus,
      }))
    );
    const handler = new ApplicationsHandler(env.JOB_DB);
    await handler.create(createApplicationRequest('https://jobs.example/promoted'));

    assert.deepEqual(
      Array.from(
        database.prepare('SELECT status FROM job_search_results ORDER BY status').all(),
        (row) => row.status
      ),
      ['dismissed', 'new', 'promoted']
    );
    assert.equal(database.prepare('SELECT status FROM applications').get().status, 'saved');
  } finally {
    database.close();
  }
});
