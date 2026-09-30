import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createSqliteD1 } from './history-test-kit.js';

const MIGRATION_URL = new URL(
  '../../../../migrations/0008_wanted_applied_at_utc.sql',
  import.meta.url
);
const UTC = '2026-09-26T05:15:00.414Z';

// [id, source, created_at, applied_at]
const SEED = [
  ['wanted-naive', 'wanted', '2026-09-30T12:17:13', '2026-09-30T12:17:13'],
  ['wanted-naive-midnight', 'wanted', '2026-09-01T00:30:00', '2026-09-01T00:30:00'],
  ['wanted-mixed', 'wanted', UTC, '2026-09-30T12:17:13'],
  ['wanted-utc', 'wanted', UTC, UTC],
  ['wanted-offset', 'wanted', '2026-09-30T12:17:13+09:00', '2026-09-30T12:17:13+09:00'],
  ['wanted-date-only', 'wanted', '2026-09-01', '2026-09-01'],
  ['wanted-null', 'wanted', UTC, null],
  ['jobkorea-date-only', 'jobkorea', '2026-09-01', '2026-09-01'],
  ['cliproxy-utc', 'cliproxy', UTC, UTC],
  ['cliproxy-naive', 'cliproxy', '2026-09-30T12:17:13', '2026-09-30T12:17:13'],
];

// Only these values are exact naive Wanted datetimes; everything else must survive untouched.
const CONVERTED = {
  'wanted-naive': {
    created_at: '2026-09-30T03:17:13.000Z',
    applied_at: '2026-09-30T03:17:13.000Z',
  },
  'wanted-naive-midnight': {
    created_at: '2026-08-31T15:30:00.000Z',
    applied_at: '2026-08-31T15:30:00.000Z',
  },
  'wanted-mixed': { applied_at: '2026-09-30T03:17:13.000Z' },
};

function seededDatabase() {
  const { sqlite } = createSqliteD1();
  const insert = sqlite.prepare(
    `INSERT INTO applications (id, source, position, company, status, created_at, updated_at, applied_at)
     VALUES (?, ?, 'Role', 'Company', 'applied', ?, ?, ?)`
  );
  for (const [id, source, createdAt, appliedAt] of SEED) {
    insert.run(id, source, createdAt, createdAt, appliedAt);
  }
  return sqlite;
}

const snapshot = (sqlite) =>
  Object.fromEntries(
    sqlite
      .prepare(
        'SELECT id, source, created_at, applied_at, updated_at FROM applications ORDER BY id'
      )
      .all()
      .map((row) => [row.id, { ...row }])
  );

describe('0008 Wanted applied_at/created_at UTC data migration', () => {
  it('converts exactly the naive Wanted values from KST to UTC ISO', () => {
    const sqlite = seededDatabase();
    const before = snapshot(sqlite);
    sqlite.exec(readFileSync(MIGRATION_URL, 'utf8'));
    const after = snapshot(sqlite);

    const expected = Object.fromEntries(
      Object.entries(before).map(([id, row]) => [id, { ...row, ...CONVERTED[id] }])
    );
    assert.deepEqual(after, expected);
    assert.equal(after['wanted-null'].applied_at, null);
    assert.equal(after['cliproxy-naive'].applied_at, '2026-09-30T12:17:13');
  });

  it('is a no-op when it runs a second time', () => {
    const sqlite = seededDatabase();
    sqlite.exec(readFileSync(MIGRATION_URL, 'utf8'));
    const once = snapshot(sqlite);
    sqlite.exec(readFileSync(MIGRATION_URL, 'utf8'));
    assert.deepEqual(snapshot(sqlite), once);
  });
});
