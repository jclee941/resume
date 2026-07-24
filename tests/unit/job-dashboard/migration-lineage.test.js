const assert = require('node:assert/strict');
const { readdirSync, readFileSync } = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const test = globalThis.test || require('node:test');

const migrationsDir = path.join(__dirname, '../../../infrastructure/database/migrations');
const canonicalMigration = '0009_add_canonical_job_urls.sql';
const canonicalRollback = '0009_add_canonical_job_urls.down.sql';

function listUpMigrations() {
  return readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql') && !file.endsWith('.down.sql'))
    .sort();
}

test('applies the canonical URL migration through the fresh infrastructure lineage', () => {
  const database = new DatabaseSync(':memory:');
  try {
    for (const migration of listUpMigrations()) {
      database.exec(readFileSync(path.join(migrationsDir, migration), 'utf8'));
    }

    const applicationColumns = database.prepare('PRAGMA table_info(applications)').all();
    const jobColumns = database.prepare('PRAGMA table_info(job_search_results)').all();

    assert.ok(applicationColumns.some(({ name }) => name === 'canonical_url'));
    assert.ok(jobColumns.some(({ name }) => name === 'canonical_url'));
  } finally {
    database.close();
  }
});

test('removes canonical URLs while preserving pre-existing job search and application records', () => {
  const database = new DatabaseSync(':memory:');
  try {
    for (const migration of listUpMigrations().filter((file) => file !== canonicalMigration)) {
      database.exec(readFileSync(path.join(migrationsDir, migration), 'utf8'));
    }

    database.exec(`
      CREATE TABLE job_search_results (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        source_url TEXT,
        position TEXT NOT NULL,
        company TEXT NOT NULL,
        crawled_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    database
      .prepare(
        `INSERT INTO applications (id, source_url, position, company)
         VALUES (?, ?, ?, ?)`
      )
      .run(
        'legacy-application-1',
        'https://jobs.example/apply?role=platform',
        'Platform Engineer',
        'Example'
      );
    database
      .prepare(
        `INSERT INTO job_search_results
          (id, source, source_url, position, company, crawled_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        'legacy-search-1',
        'wanted',
        'https://jobs.example/opening?role=platform',
        'Platform Engineer',
        'Example',
        '2026-07-23T00:00:00.000Z',
        '2026-07-23T00:00:00.000Z',
        '2026-07-23T00:00:00.000Z'
      );

    database.exec(readFileSync(path.join(migrationsDir, canonicalMigration), 'utf8'));
    database.exec(readFileSync(path.join(migrationsDir, canonicalRollback), 'utf8'));

    const applicationColumns = database.prepare('PRAGMA table_info(applications)').all();
    const jobColumns = database.prepare('PRAGMA table_info(job_search_results)').all();
    const application = database
      .prepare('SELECT id, source_url, position, company FROM applications WHERE id = ?')
      .get('legacy-application-1');
    const jobSearchResult = database.prepare('SELECT * FROM job_search_results').get();

    assert.equal(applicationColumns.some(({ name }) => name === 'canonical_url'), false);
    assert.equal(jobColumns.some(({ name }) => name === 'canonical_url'), false);
    assert.deepEqual(
      { ...application },
      {
        id: 'legacy-application-1',
        source_url: 'https://jobs.example/apply?role=platform',
        position: 'Platform Engineer',
        company: 'Example',
      }
    );
    assert.deepEqual(
      { ...jobSearchResult },
      {
        id: 'legacy-search-1',
        source: 'wanted',
        source_url: 'https://jobs.example/opening?role=platform',
        position: 'Platform Engineer',
        company: 'Example',
        crawled_at: '2026-07-23T00:00:00.000Z',
        created_at: '2026-07-23T00:00:00.000Z',
        updated_at: '2026-07-23T00:00:00.000Z',
      }
    );
  } finally {
    database.close();
  }
});
