import { readFileSync } from 'node:fs';
import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

const readdirMock = mock.fn(async () => []);
const readFileMock = mock.fn(async () => '');
globalThis.__readdirMock = readdirMock;
globalThis.__readFileMock = readFileMock;

const migrationSource = readFileSync(new URL('../index.js', import.meta.url), 'utf8').replace(
  /import\s*\{\s*readdir\s*,\s*readFile\s*\}\s*from\s*['"]node:fs\/promises['"]\s*;?/,
  'const { readdir, readFile } = { readdir: globalThis.__readdirMock, readFile: globalThis.__readFileMock };'
);
const migrationEncoded = Buffer.from(migrationSource).toString('base64');
const { MigrationRunner } = await import(`data:text/javascript;base64,${migrationEncoded}`);

function createDb(appliedResults = []) {
  const bindCalls = [];
  const exec = mock.fn(async () => {});
  const all = mock.fn(async () => ({ results: appliedResults }));
  const prepare = mock.fn((sql) => ({
    all,
    bind: mock.fn((...args) => ({
      run: mock.fn(async () => {
        bindCalls.push({ sql, args });
      }),
    })),
  }));

  return {
    db: { exec, prepare },
    bindCalls,
    all,
    exec,
    prepare,
    setApplied(next) {
      all.mock.mockImplementation(async () => ({ results: next }));
    },
  };
}

async function loadMigrationModule({ readdirImpl, readFileImpl }) {
  readdirMock.mock.mockImplementation(readdirImpl || (async () => []));
  readFileMock.mock.mockImplementation(readFileImpl || (async () => ''));
  return { MigrationRunner };
}

describe('MigrationRunner', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  it('ensures migrations table in normal and dry-run modes', async () => {
    const { MigrationRunner } = await loadMigrationModule({});
    const logs = [];

    const realDb = createDb();
    const realRunner = new MigrationRunner({
      db: realDb.db,
      migrationsDir: '/migrations',
      dryRun: false,
      logger: (msg) => logs.push(msg),
    });
    await realRunner.ensureMigrationsTable();
    assert.equal(realDb.exec.mock.calls.length, 1);

    const dryDb = createDb();
    const dryRunner = new MigrationRunner({
      db: dryDb.db,
      migrationsDir: '/migrations',
      dryRun: true,
      logger: (msg) => logs.push(msg),
    });
    await dryRunner.ensureMigrationsTable();
    assert.equal(dryDb.exec.mock.calls.length, 0);
    assert.ok(logs.some((msg) => msg.includes('[dry-run] Would create _migrations table')));
  });

  it('discovers and sorts valid migrations while parsing filenames and down files', async () => {
    const readdirMock = mock.fn(async () => [
      '0002_add_idx.sql',
      'invalid.txt',
      '0001_create_table.sql',
      '0001_create_table.down.sql',
      '0003_feature.down.sql',
    ]);
    const { MigrationRunner } = await loadMigrationModule({ readdirImpl: readdirMock });

    const runner = new MigrationRunner({
      db: createDb().db,
      migrationsDir: '/migrations',
      logger: () => {},
    });

    const migrations = await runner.discoverMigrations();

    assert.equal(migrations.length, 2);
    assert.deepEqual(
      migrations.map((m) => ({ version: m.version, name: m.name })),
      [
        { version: '0001', name: 'create_table' },
        { version: '0002', name: 'add_idx' },
      ]
    );
    assert.ok(migrations[0].upPath.endsWith('/migrations/0001_create_table.sql'));
    assert.ok(migrations[0].downPath.endsWith('/migrations/0001_create_table.down.sql'));
    assert.equal(migrations[1].downPath, null);
  });

  it('gets applied migrations and propagates query errors', async () => {
    const { MigrationRunner } = await loadMigrationModule({});
    const goodDb = createDb([
      {
        id: 1,
        version: '0001',
        name: 'create_table',
        applied_at: '2024-01-01',
        checksum: 'abc',
        execution_time_ms: 5,
      },
    ]);

    const runner = new MigrationRunner({
      db: goodDb.db,
      migrationsDir: '/migrations',
      logger: () => {},
    });
    const applied = await runner.getAppliedMigrations();
    assert.equal(applied.length, 1);

    const errorDb = createDb();
    errorDb.prepare.mock.mockImplementation(() => ({
      all: mock.fn(async () => {
        throw new Error('query failed');
      }),
      bind: mock.fn(() => ({ run: mock.fn(async () => {}) })),
    }));
    const logs = [];
    const errorRunner = new MigrationRunner({
      db: errorDb.db,
      migrationsDir: '/migrations',
      logger: (msg) => logs.push(msg),
    });

    await assert.rejects(() => errorRunner.getAppliedMigrations(), /query failed/);
    assert.ok(logs.some((msg) => msg.includes('Failed to get applied migrations')));
  });

  it('computes pending migrations by excluding applied versions', async () => {
    const readdirMock = mock.fn(async () => ['0001_a.sql', '0002_b.sql']);
    const { MigrationRunner } = await loadMigrationModule({ readdirImpl: readdirMock });
    const state = createDb([{ version: '0001' }]);

    const runner = new MigrationRunner({
      db: state.db,
      migrationsDir: '/migrations',
      logger: () => {},
    });
    const pending = await runner.getPendingMigrations();

    assert.equal(pending.length, 1);
    assert.equal(pending[0].version, '0002');
  });

  it('migrate returns empty when there are no pending migrations', async () => {
    const readdirMock = mock.fn(async () => ['0001_first.sql']);
    const { MigrationRunner } = await loadMigrationModule({ readdirImpl: readdirMock });
    const state = createDb([{ version: '0001' }]);
    const logs = [];

    const runner = new MigrationRunner({
      db: state.db,
      migrationsDir: '/migrations',
      logger: (msg) => logs.push(msg),
    });

    const result = await runner.migrate();

    assert.deepEqual(result, []);
    assert.ok(logs.some((msg) => msg.includes('No pending migrations.')));
  });

  it('applies migration statements and records deterministic checksum', async () => {
    const sqlByPath = {
      '/migrations/0001_first.sql':
        'CREATE TABLE x (id INTEGER); -- ignore\n; INSERT INTO x VALUES (1);',
    };
    const readFileMock = mock.fn(async (path) => sqlByPath[path]);
    const { MigrationRunner } = await loadMigrationModule({
      readdirImpl: mock.fn(async () => ['0001_first.sql']),
      readFileImpl: readFileMock,
    });
    const state = createDb([]);

    const runner = new MigrationRunner({
      db: state.db,
      migrationsDir: '/migrations',
      logger: () => {},
    });
    const migration = {
      version: '0001',
      name: 'first',
      filename: '0001_first.sql',
      upPath: '/migrations/0001_first.sql',
      downPath: null,
    };

    const one = await runner._applyMigration(migration);
    const firstChecksum = state.bindCalls[state.bindCalls.length - 1].args[2];
    const two = await runner._applyMigration(migration);
    const secondChecksum = state.bindCalls[state.bindCalls.length - 1].args[2];

    assert.equal(one.status, 'applied');
    assert.equal(two.status, 'applied');
    assert.equal(firstChecksum, secondChecksum);
    assert.equal(state.exec.mock.calls.length, 4);
    const executed = state.exec.mock.calls.map((c) => c.arguments[0]);
    assert.ok(executed.includes('CREATE TABLE x (id INTEGER)'));
    assert.ok(executed.includes('INSERT INTO x VALUES (1)'));
  });

  it('runs migrate in dry-run mode without executing SQL', async () => {
    const readFileMock = mock.fn(
      async () => 'CREATE TABLE y (id INTEGER); INSERT INTO y VALUES (1);'
    );
    const { MigrationRunner } = await loadMigrationModule({
      readdirImpl: mock.fn(async () => ['0001_y.sql']),
      readFileImpl: readFileMock,
    });
    const state = createDb([]);
    const logs = [];

    const runner = new MigrationRunner({
      db: state.db,
      migrationsDir: '/migrations',
      dryRun: true,
      logger: (msg) => logs.push(msg),
    });

    const result = await runner.migrate();

    assert.equal(result.length, 1);
    assert.equal(result[0].status, 'dry_run');
    assert.equal(result[0].statements.length, 2);
    assert.equal(state.exec.mock.calls.length, 0);
    assert.ok(logs.some((msg) => msg.includes('[dry-run] Would apply: 0001_y')));
  });

  it('rolls back with skipped results when migration file is missing or has no down path', async () => {
    const { MigrationRunner } = await loadMigrationModule({
      readdirImpl: mock.fn(async () => ['0002_exists.sql']),
      readFileImpl: mock.fn(async () => 'DROP TABLE t;'),
    });
    const state = createDb([
      { version: '0001', name: 'missing' },
      { version: '0002', name: 'exists' },
    ]);
    const logs = [];

    const runner = new MigrationRunner({
      db: state.db,
      migrationsDir: '/migrations',
      logger: (msg) => logs.push(msg),
    });

    const result = await runner.rollback(2);

    assert.equal(result.length, 2);
    assert.equal(result[0].status, 'skipped');
    assert.equal(result[1].status, 'skipped');
    assert.ok(logs.some((msg) => msg.includes('not found. Skipping')));
    assert.ok(logs.some((msg) => msg.includes('No down migration')));
  });

  it('runs rollback in dry-run mode and returns statements', async () => {
    const readdirMock = mock.fn(async () => ['0001_first.sql', '0001_first.down.sql']);
    const readFileMock = mock.fn(async () => 'DROP TABLE first; DELETE FROM first;');
    const { MigrationRunner } = await loadMigrationModule({
      readdirImpl: readdirMock,
      readFileImpl: readFileMock,
    });
    const state = createDb([{ version: '0001', name: 'first' }]);

    const runner = new MigrationRunner({
      db: state.db,
      migrationsDir: '/migrations',
      dryRun: true,
      logger: () => {},
    });

    const result = await runner.rollback(1);

    assert.equal(result.length, 1);
    assert.equal(result[0].status, 'dry_run');
    assert.equal(result[0].statements.length, 2);
    assert.equal(state.exec.mock.calls.length, 0);
  });

  it('returns rollback empty result when there are no applied migrations', async () => {
    const { MigrationRunner } = await loadMigrationModule({
      readdirImpl: mock.fn(async () => ['0001_a.sql']),
    });
    const state = createDb([]);
    const logs = [];

    const runner = new MigrationRunner({
      db: state.db,
      migrationsDir: '/migrations',
      logger: (msg) => logs.push(msg),
    });

    const result = await runner.rollback(1);

    assert.deepEqual(result, []);
    assert.ok(logs.some((msg) => msg.includes('No migrations to rollback.')));
  });

  it('computes status with matching, mismatching, and pending checksums', async () => {
    const files = ['0001_a.sql', '0002_b.sql', '0003_c.sql'];
    const sqlByPath = {
      '/migrations/0001_a.sql': 'CREATE TABLE a (id INTEGER);',
      '/migrations/0002_b.sql': 'CREATE TABLE b (id INTEGER);',
      '/migrations/0003_c.sql': 'CREATE TABLE c (id INTEGER);',
    };
    const { MigrationRunner } = await loadMigrationModule({
      readdirImpl: mock.fn(async () => files),
      readFileImpl: mock.fn(async (path) => sqlByPath[path]),
    });
    const state = createDb([]);

    const runner = new MigrationRunner({
      db: state.db,
      migrationsDir: '/migrations',
      logger: () => {},
    });

    await runner._applyMigration({
      version: '0001',
      name: 'a',
      filename: '0001_a.sql',
      upPath: '/migrations/0001_a.sql',
      downPath: null,
    });

    const checksum0001 = state.bindCalls[state.bindCalls.length - 1].args[2];
    state.setApplied([
      {
        version: '0001',
        name: 'a',
        applied_at: '2024-01-01',
        checksum: checksum0001,
        execution_time_ms: 1,
      },
      {
        version: '0002',
        name: 'b',
        applied_at: '2024-01-01',
        checksum: 'deadbeef',
        execution_time_ms: 1,
      },
    ]);

    const result = await runner.status();

    assert.equal(result.total, 3);
    assert.equal(result.applied, 2);
    assert.equal(result.pending, 1);
    assert.equal(result.migrations.find((m) => m.version === '0001').checksum_match, true);
    assert.equal(result.migrations.find((m) => m.version === '0002').checksum_match, false);
    assert.equal(result.migrations.find((m) => m.version === '0003').checksum_match, null);
  });

  it('runs seed with no seeds dir, no files, dry-run, and execute paths', async () => {
    const { MigrationRunner } = await loadMigrationModule({
      readdirImpl: mock.fn(async (dir) => {
        if (dir === '/empty-seeds') return [];
        return ['002.sql', '001.sql'];
      }),
      readFileImpl: mock.fn(async (path) => {
        if (path.endsWith('001.sql')) return 'INSERT INTO t VALUES (1); --x\n;';
        if (path.endsWith('002.sql')) return '-- comment;\nINSERT INTO t VALUES (2);';
        return '';
      }),
    });
    const logs = [];

    const noSeedsRunner = new MigrationRunner({
      db: createDb().db,
      migrationsDir: '/migrations',
      logger: (msg) => logs.push(msg),
    });
    const noSeeds = await noSeedsRunner.seed();
    assert.deepEqual(noSeeds, []);

    const emptyRunner = new MigrationRunner({
      db: createDb().db,
      migrationsDir: '/migrations',
      seedsDir: '/empty-seeds',
      logger: (msg) => logs.push(msg),
    });
    const empty = await emptyRunner.seed();
    assert.deepEqual(empty, []);

    const dryState = createDb();
    const dryRunner = new MigrationRunner({
      db: dryState.db,
      migrationsDir: '/migrations',
      seedsDir: '/seeds',
      dryRun: true,
      logger: (msg) => logs.push(msg),
    });
    const dryApplied = await dryRunner.seed();
    assert.deepEqual(dryApplied, ['001.sql', '002.sql']);
    assert.equal(dryState.exec.mock.calls.length, 0);

    const liveState = createDb();
    const liveRunner = new MigrationRunner({
      db: liveState.db,
      migrationsDir: '/migrations',
      seedsDir: '/seeds',
      logger: (msg) => logs.push(msg),
    });
    const liveApplied = await liveRunner.seed();
    assert.deepEqual(liveApplied, ['001.sql', '002.sql']);
    assert.equal(liveState.exec.mock.calls.length, 2);
  });

  it('validates migration files and reports empty and read errors', async () => {
    const files = ['0001_one.sql', '0001_one.down.sql', '0002_two.sql'];
    const { MigrationRunner } = await loadMigrationModule({
      readdirImpl: mock.fn(async () => files),
      readFileImpl: mock.fn(async (path) => {
        if (path.endsWith('0001_one.sql')) return ' ; -- only comment ;';
        if (path.endsWith('0001_one.down.sql')) return '';
        if (path.endsWith('0002_two.sql')) throw new Error('cannot read');
        return 'SELECT 1;';
      }),
    });

    const runner = new MigrationRunner({
      db: createDb().db,
      migrationsDir: '/migrations',
      logger: () => {},
    });
    const result = await runner.validate();

    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some((e) => e.file === '0001_one.sql' && e.error === 'Empty migration file')
    );
    assert.ok(
      result.errors.some(
        (e) => e.file === '0001_one.down.sql' && e.error === 'Empty down migration file'
      )
    );
    assert.ok(result.errors.some((e) => e.file === '0002_two.sql' && e.error === 'cannot read'));
  });

  it('rolls back migration in non-dry-run mode and removes migration record', async () => {
    const { MigrationRunner } = await loadMigrationModule({
      readdirImpl: mock.fn(async () => ['0001_one.sql', '0001_one.down.sql']),
      readFileImpl: mock.fn(async () => 'DROP TABLE one; DELETE FROM one;'),
    });
    const state = createDb([{ version: '0001', name: 'one' }]);

    const runner = new MigrationRunner({
      db: state.db,
      migrationsDir: '/migrations',
      logger: () => {},
    });
    const result = await runner.rollback(1);

    assert.equal(result.length, 1);
    assert.equal(result[0].status, 'rolled_back');
    assert.equal(state.exec.mock.calls.length, 2);
    const deleteBind = state.bindCalls.find((c) => c.sql.includes('DELETE FROM _migrations'));
    assert.ok(deleteBind);
    assert.deepEqual(deleteBind.args, ['0001']);
  });
});
