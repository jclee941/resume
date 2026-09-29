const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const test = globalThis.test || require('node:test');

const root = path.join(__dirname, '../../..');
const migrationsDir = path.join(root, 'apps/job-dashboard/migrations');
const schemaPath = path.join(root, 'apps/job-dashboard/schema.sql');

function migrationFiles() {
  return fs
    .readdirSync(migrationsDir)
    .filter((file) => /^\d{4}_[\w-]+\.sql$/.test(file))
    .sort();
}

function buildDatabase(files) {
  const database = new DatabaseSync(':memory:');
  for (const file of files) database.exec(fs.readFileSync(file, 'utf8'));
  return database;
}

function describeSchema(database) {
  return database
    .prepare(
      "SELECT type, name, tbl_name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name"
    )
    .all()
    .map(({ type, name, tbl_name: table }) => {
      if (type === 'table') {
        const columns = database
          .prepare(`PRAGMA table_info(${name})`)
          .all()
          .map((c) => `${c.name} ${c.type} notnull=${c.notnull} default=${c.dflt_value} pk=${c.pk}`)
          .sort();
        return `table ${name}: ${columns.join('; ')}`;
      }
      if (type === 'index') {
        const columns = database
          .prepare(`PRAGMA index_info(${name})`)
          .all()
          .map((c) => c.name);
        return `index ${name} on ${table}(${columns.join(', ')})`;
      }
      return `${type} ${name}`;
    });
}

test('the JOB_DB migration lineage starts with a baseline migration', () => {
  assert.equal(migrationFiles()[0], '0001_init.sql');
});

test('applying every JOB_DB migration to an empty database reproduces schema.sql', () => {
  const migrated = buildDatabase(migrationFiles().map((file) => path.join(migrationsDir, file)));
  const snapshot = buildDatabase([schemaPath]);
  try {
    assert.deepEqual(describeSchema(migrated), describeSchema(snapshot));
  } finally {
    migrated.close();
    snapshot.close();
  }
});
