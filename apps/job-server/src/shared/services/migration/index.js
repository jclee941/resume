export { MigrationRunner } from './migration-runner.js';
export {
  computeChecksum,
  parseMigrationFilename,
  splitStatements,
  discoverMigrations,
  getAppliedMigrations,
  getPendingMigrations,
} from './discovery.js';
export { validate } from './validation.js';
export { applyMigration, rollbackMigration, MIGRATIONS_TABLE } from './execution.js';
/** @returns {Promise<any>} */
async function applyMigration(db, migration, dryRun, logger) {
  const sql = await readFile(migration.upPath, 'utf-8'),
    stmts = splitStatements(sql),
    checksum = computeChecksum(sql);
  if (dryRun) {
    logger(`[dry-run] Would apply: ${migration.version}_${migration.name}`);
    return {
      version: migration.version,
      name: migration.name,
      status: 'dry_run',
      execution_time_ms: 0,
      statements: stmts,
    };
  }
  logger(`Applying: ${migration.version}_${migration.name}`);
  const start = Date.now();
  for (const s of stmts) await db.exec(s);
  const ms = Date.now() - start;
  await db
    .prepare(
      `INSERT INTO ${MIGRATIONS_TABLE} (version, name, checksum, execution_time_ms) VALUES (?,?,?,?)`
    )
    .bind(migration.version, migration.name, checksum, ms)
    .run();
  logger(`Applied: ${migration.version}_${migration.name} (${ms}ms)`);
  return {
    version: migration.version,
    name: migration.name,
    status: 'applied',
    execution_time_ms: ms,
  };
}

/** @returns {Promise<any>} */
async function rollbackMigration(db, migration, dryRun, logger) {
  const sql = await readFile(migration.downPath, 'utf-8'),
    stmts = splitStatements(sql);
  if (dryRun) {
    logger(`[dry-run] Would rollback: ${migration.version}_${migration.name}`);
    return {
      version: migration.version,
      name: migration.name,
      status: 'dry_run',
      execution_time_ms: 0,
      statements: stmts,
    };
  }
  logger(`Rolling back: ${migration.version}_${migration.name}`);
  const start = Date.now();
  for (const s of stmts) await db.exec(s);
  const ms = Date.now() - start;
  await db
    .prepare(`DELETE FROM ${MIGRATIONS_TABLE} WHERE version = ?`)
    .bind(migration.version)
    .run();
  logger(`Rolled back: ${migration.version}_${migration.name} (${ms}ms)`);
  return {
    version: migration.version,
    name: migration.name,
    status: 'rolled_back',
    execution_time_ms: ms,
  };
}

const CREATE_MIGRATIONS_TABLE = `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (id INTEGER PRIMARY KEY AUTOINCREMENT, version TEXT NOT NULL UNIQUE, name TEXT NOT NULL, applied_at TEXT NOT NULL DEFAULT (datetime('now')), checksum TEXT NOT NULL, execution_time_ms INTEGER NOT NULL DEFAULT 0);`;

/** D1 Migration Runner */
export class MigrationRunner {
  constructor({ db, migrationsDir, seedsDir, dryRun = false, logger = console.log }) {
    this.db = db;
    this.migrationsDir = migrationsDir;
    this.seedsDir = seedsDir || null;
    this.dryRun = dryRun;
    this.logger = logger;
  }

  async ensureMigrationsTable() {
    if (this.dryRun) {
      this.logger('[dry-run] Would create _migrations table');
      return;
    }
    await this.db.exec(CREATE_MIGRATIONS_TABLE);
  }

  async discoverMigrations() {
    return discoverMigrations(this.migrationsDir);
  }

  async getAppliedMigrations() {
    try {
      return await getAppliedMigrations(this.db);
    } catch (e) {
      this.logger(`Failed to get applied migrations: ${e?.message || e}`);
      throw e;
    }
  }

  async getPendingMigrations() {
    return getPendingMigrations(this.migrationsDir, this.db);
  }

  async migrate() {
    await this.ensureMigrationsTable();
    const pending = await this.getPendingMigrations();
    if (!pending.length) {
      this.logger('No pending migrations.');
      return [];
    }
    this.logger(`Found ${pending.length} pending migration(s).`);
    const results = [];
    for (const m of pending) results.push(await this._applyMigration(m));
    return results;
  }

  async rollback(count = 1) {
    const applied = await this.getAppliedMigrations();
    if (!applied.length) {
      this.logger('No migrations to rollback.');
      return [];
    }
    const all = await this.discoverMigrations(),
      toRollback = applied.slice(-count).reverse(),
      results = [];
    for (const record of toRollback) {
      const m = all.find((m) => m.version === record.version);
      if (!m) {
        this.logger(`Warning: Migration file for ${record.version} not found. Skipping.`);
        results.push({
          version: record.version,
          name: record.name,
          status: 'skipped',
          execution_time_ms: 0,
        });
        continue;
      }
      if (!m.downPath) {
        this.logger(`Warning: No down migration for ${record.version}_${record.name}. Skipping.`);
        results.push({
          version: record.version,
          name: record.name,
          status: 'skipped',
          execution_time_ms: 0,
        });
        continue;
      }
      results.push(await this._rollbackMigration(m));
    }
    return results;
  }

  async status() {
    const all = await this.discoverMigrations(),
      applied = await this.getAppliedMigrations(),
      map = new Map(applied.map((m) => [m.version, m])),
      result = [];
    for (const m of all) {
      const r = map.get(m.version);
      const sql = await readFile(m.upPath, 'utf-8');
      result.push({
        version: m.version,
        name: m.name,
        applied: !!r,
        applied_at: r?.applied_at || null,
        has_down: !!m.downPath,
        checksum_match: r ? r.checksum === computeChecksum(sql) : null,
      });
    }
    return {
      total: all.length,
      applied: applied.length,
      pending: all.length - applied.length,
      migrations: result,
    };
  }

  async seed() {
    if (!this.seedsDir) {
      this.logger('No seeds directory configured.');
      return [];
    }
    const files = (await readdir(this.seedsDir)).filter((f) => f.endsWith('.sql')).sort();
    if (!files.length) {
      this.logger('No seed files found.');
      return [];
    }
    const applied = [];
    for (const file of files) {
      const stmts = splitStatements(await readFile(join(this.seedsDir, file), 'utf-8'));
      if (this.dryRun) {
        this.logger(`[dry-run] Would apply seed: ${file} (${stmts.length} statements)`);
        applied.push(file);
        continue;
      }
      this.logger(`Applying seed: ${file}`);
      for (const s of stmts) await this.db.exec(s);
      applied.push(file);
    }
    return applied;
  }

  async validate() {
    return validate(this.migrationsDir, this.logger);
  }

  async _applyMigration(m) {
    return applyMigration(this.db, m, this.dryRun, this.logger);
  }

  async _rollbackMigration(m) {
    return rollbackMigration(this.db, m, this.dryRun, this.logger);
  }
}
