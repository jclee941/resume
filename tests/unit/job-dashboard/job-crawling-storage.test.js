const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const test = globalThis.test || require('node:test');

const schemaPath = path.join(__dirname, '../../../apps/job-dashboard/schema.sql');
const storageModulePromise = import(
  path.join(__dirname, '../../../apps/job-dashboard/src/workflows/job-crawling/job-storage.js')
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
          };
        },
      };
    },
    async batch(statements) {
      return statements.map((statement) => statement.run());
    },
  };
}

test('saveMatchedJobs upserts a stable job while preserving workflow-owned fields', async () => {
  const { saveMatchedJobs } = await storageModulePromise;
  const database = new DatabaseSync(':memory:');
  try {
    database.exec(readFileSync(schemaPath, 'utf8'));
    const env = { JOB_DB: createD1Adapter(database) };

    const firstJob = {
      id: 'wanted-101',
      company: 'Initial Company',
      position: 'Platform Engineer',
      source: 'wanted',
      sourceUrl: 'https://www.wanted.co.kr/wd/101',
      location: 'Seoul',
      description: 'Initial description',
      techStack: ['Node.js'],
      experienceLevel: 'senior',
      matchScore: 81,
    };
    const refreshedJob = {
      ...firstJob,
      company: 'Refreshed Company',
      position: 'Senior Platform Engineer',
      description: 'Refreshed description',
      techStack: ['Node.js', 'Cloudflare'],
      matchScore: 94,
    };

    assert.deepEqual(await saveMatchedJobs(env, [firstJob]), { saved: 1 });
    const inserted = database
      .prepare('SELECT status, created_at FROM job_search_results WHERE id = ?')
      .get('wanted-101');
    assert.ok(inserted);
    assert.equal(inserted.status, 'new');
    assert.ok(inserted.created_at);

    database
      .prepare("UPDATE job_search_results SET status = 'reviewing' WHERE id = ?")
      .run('wanted-101');
    assert.deepEqual(await saveMatchedJobs(env, [refreshedJob]), { saved: 1 });

    const rows = database
      .prepare(
        `
      SELECT id, source, source_url, position, company, location,
             description, tech_stack, experience_level, match_score, status,
             crawled_at, created_at, updated_at
      FROM job_search_results
      WHERE id = ?
    `
      )
      .all('wanted-101');

    assert.equal(rows.length, 1);
    assert.deepEqual(
      { ...rows[0] },
      {
        id: 'wanted-101',
        source: 'wanted',
        source_url: 'https://www.wanted.co.kr/wd/101',
        position: 'Senior Platform Engineer',
        company: 'Refreshed Company',
        location: 'Seoul',
        description: 'Refreshed description',
        tech_stack: JSON.stringify(['Node.js', 'Cloudflare']),
        experience_level: 'senior',
        match_score: 94,
        status: 'reviewing',
        crawled_at: rows[0].crawled_at,
        created_at: inserted.created_at,
        updated_at: rows[0].updated_at,
      }
    );
    assert.ok(rows[0].crawled_at);
    assert.ok(rows[0].updated_at);
  } finally {
    database.close();
  }
});

test('saveMatchedJobs stores omitted crawler fields as SQL NULL with a zero score', async () => {
  const { saveMatchedJobs } = await storageModulePromise;
  const database = new DatabaseSync(':memory:');
  try {
    database.exec(readFileSync(schemaPath, 'utf8'));
    const env = { JOB_DB: createD1Adapter(database) };

    const crawlerJob = {
      id: 'wanted-102',
      source: 'wanted',
      url: 'https://www.wanted.co.kr/wd/102',
      position: 'Backend Engineer',
      company: 'Minimal Company',
    };

    assert.deepEqual(await saveMatchedJobs(env, [crawlerJob]), { saved: 1 });

    const row = database
      .prepare(
        `
      SELECT id, location, description, tech_stack, experience_level, match_score
      FROM job_search_results
      WHERE id = ?
    `
      )
      .get('wanted-102');

    assert.deepEqual(
      { ...row },
      {
        id: 'wanted-102',
        location: null,
        description: null,
        tech_stack: null,
        experience_level: null,
        match_score: 0,
      }
    );
  } finally {
    database.close();
  }
});
