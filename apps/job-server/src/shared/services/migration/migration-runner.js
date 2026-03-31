/**
 * D1 Database Migration Runner - Core Class
 * @module migration/migration-runner
 */
import { validate } from './validation.js';
import { applyMigration, rollbackMigration, MIGRATIONS_TABLE } from './execution.js';
import { discoverMigrations, getAppliedMigrations, getPendingMigrations } from './discovery.js';

const CREATE_MIGRATIONS_TABLE = `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now')),
  checksum TEXT NOT NULL,
  execution_time_ms INTEGER NOT NULL DEFAULT 0
);`;

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
    const all = await this.discoverMigrations();
    const toRollback = applied.slice(-count).reverse();
    const results = [];
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
    const all = await this.discoverMigrations();
    const applied = await this.getAppliedMigrations();
    const map = new Map(applied.map((m) => [m.version, m]));
    const result = [];
    for (const m of all) {
      const r = map.get(m.version);
      result.push({
        version: m.version,
        name: m.name,
        applied: !!r,
        applied_at: r?.applied_at || null,
        has_down: !!m.downPath,
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
    const { readdir, readFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const files = (await readdir(this.seedsDir)).filter((f) => f.endsWith('.sql')).sort();
    if (!files.length) {
      this.logger('No seed files found.');
      return [];
    }
    const applied = [];
    for (const file of files) {
      const sql = await readFile(join(this.seedsDir, file), 'utf-8');
      const stmts = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('--'));
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
