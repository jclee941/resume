/**
 * D1 Database Migration Runner
 *
 * Provides schema versioning, up/down migration support,
 * migration history tracking, dry-run mode, and seed management.
 *
 * @module migration
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';

/**
 * @typedef {Object} MigrationRecord
 * @property {number} id - Auto-incremented ID
 * @property {string} version - Migration version (e.g., '0001')
 * @property {string} name - Migration name (e.g., 'create_job_applications')
 * @property {string} applied_at - ISO timestamp when applied
 * @property {string} checksum - SHA-256 hash of migration content
 * @property {number} execution_time_ms - Execution duration in milliseconds
 */

/**
 * @typedef {Object} MigrationFile
 * @property {string} version - Numeric version string (e.g., '0001')
 * @property {string} name - Human-readable name
 * @property {string} filename - Original filename
 * @property {string} upPath - Path to up migration SQL
 * @property {string|null} downPath - Path to down migration SQL (nullable)
 */

/**
 * @typedef {Object} MigrationResult
 * @property {string} version - Migration version
 * @property {string} name - Migration name
 * @property {'applied'|'rolled_back'|'skipped'|'dry_run'} status
 * @property {number} execution_time_ms - Duration in ms
 * @property {string[]} [statements] - SQL statements (dry-run only)
 */

const MIGRATIONS_TABLE = '_migrations';

const CREATE_MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now')),
  checksum TEXT NOT NULL,
  execution_time_ms INTEGER NOT NULL DEFAULT 0
);
`;

/**
 * Compute a simple checksum for migration content.
 * Uses a fast hash suitable for change detection (not security).
 *
 * @param {string} content - SQL content to hash
 * @returns {string} Hex checksum
 */
function computeChecksum(content) {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Parse a migration filename into version and name.
 *
 * @param {string} filename - e.g., '0001_create_job_applications.sql'
 * @returns {{ version: string, name: string } | null}
 */
function parseMigrationFilename(filename) {
  const match = filename.match(/^(\d{4})_(.+)\.sql$/);
  if (!match) return null;
  return { version: match[1], name: match[2] };
}

/**
 * Split SQL content into individual statements.
 * Handles multi-line statements and ignores comments.
 *
 * @param {string} sql - Raw SQL content
 * @returns {string[]} Non-empty SQL statements
 */
function splitStatements(sql) {
  return sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));
}

/**
 * D1 Migration Runner.
 *
 * Manages database schema migrations for Cloudflare D1.
 * Supports forward migrations, rollbacks, status checks,
 * dry-run mode, and seed data.
 */
export class MigrationRunner {
  /**
   * @param {Object} options
   * @param {import('@cloudflare/workers-types').D1Database} options.db - D1 database binding
   * @param {string} options.migrationsDir - Path to migration SQL files
   * @param {string} [options.seedsDir] - Path to seed SQL files
   * @param {boolean} [options.dryRun=false] - If true, log SQL without executing
   * @param {(msg: string) => void} [options.logger=console.log] - Logging function
   */
  constructor({ db, migrationsDir, seedsDir, dryRun = false, logger = console.log }) {
    this.db = db;
    this.migrationsDir = migrationsDir;
    this.seedsDir = seedsDir || null;
    this.dryRun = dryRun;
    this.logger = logger;
  }

  /**
   * Ensure the _migrations tracking table exists.
   */
  async ensureMigrationsTable() {
    if (this.dryRun) {
      this.logger('[dry-run] Would create _migrations table');
      return;
    }
    await this.db.exec(CREATE_MIGRATIONS_TABLE);
  }

  /**
   * Discover all migration files in the migrations directory.
   * Returns them sorted by version number.
   *
   * @returns {Promise<MigrationFile[]>}
   */
  async discoverMigrations() {
    const files = await readdir(this.migrationsDir);
    /** @type {MigrationFile[]} */
    const migrations = [];

    for (const file of files) {
      if (file.endsWith('.down.sql')) continue;
      const parsed = parseMigrationFilename(file);
      if (!parsed) continue;

      const downFilename = `${parsed.version}_${parsed.name}.down.sql`;
      const downExists = files.includes(downFilename);

      migrations.push({
        version: parsed.version,
        name: parsed.name,
        filename: file,
        upPath: join(this.migrationsDir, file),
        downPath: downExists ? join(this.migrationsDir, downFilename) : null,
      });
    }

    return migrations.sort((a, b) => a.version.localeCompare(b.version));
  }

  /**
   * Get all applied migrations from the tracking table.
   *
   * @returns {Promise<MigrationRecord[]>}
   */
  async getAppliedMigrations() {
    try {
      const result = await this.db
        .prepare(`SELECT * FROM ${MIGRATIONS_TABLE} ORDER BY version ASC`)
        .all();
      return result.results || [];
    } catch {
      // Table doesn't exist yet
      return [];
    }
  }

  /**
   * Get pending migrations that haven't been applied yet.
   *
   * @returns {Promise<MigrationFile[]>}
   */
  async getPendingMigrations() {
    const all = await this.discoverMigrations();
    const applied = await this.getAppliedMigrations();
    const appliedVersions = new Set(applied.map((m) => m.version));
    return all.filter((m) => !appliedVersions.has(m.version));
  }

  /**
   * Run all pending migrations.
   *
   * @returns {Promise<MigrationResult[]>}
   */
  async migrate() {
    await this.ensureMigrationsTable();
    const pending = await this.getPendingMigrations();

    if (pending.length === 0) {
      this.logger('No pending migrations.');
      return [];
    }

    this.logger(`Found ${pending.length} pending migration(s).`);
    /** @type {MigrationResult[]} */
    const results = [];

    for (const migration of pending) {
      const result = await this._applyMigration(migration);
      results.push(result);
    }

    return results;
  }

  /**
   * Rollback the last N applied migrations.
   *
   * @param {number} [count=1] - Number of migrations to rollback
   * @returns {Promise<MigrationResult[]>}
   */
  async rollback(count = 1) {
    const applied = await this.getAppliedMigrations();
    if (applied.length === 0) {
      this.logger('No migrations to rollback.');
      return [];
    }

    const all = await this.discoverMigrations();
    const toRollback = applied.slice(-count).reverse();
    /** @type {MigrationResult[]} */
    const results = [];

    for (const record of toRollback) {
      const migration = all.find((m) => m.version === record.version);
      if (!migration) {
        this.logger(`Warning: Migration file for ${record.version} not found. Skipping.`);
        results.push({
          version: record.version,
          name: record.name,
          status: 'skipped',
          execution_time_ms: 0,
        });
        continue;
      }

      if (!migration.downPath) {
        this.logger(`Warning: No down migration for ${record.version}_${record.name}. Skipping.`);
        results.push({
          version: record.version,
          name: record.name,
          status: 'skipped',
          execution_time_ms: 0,
        });
        continue;
      }

      const result = await this._rollbackMigration(migration);
      results.push(result);
    }

    return results;
  }

  /**
   * Get migration status: applied, pending, and any checksum mismatches.
   *
   * @returns {Promise<Object>}
   */
  async status() {
    const all = await this.discoverMigrations();
    const applied = await this.getAppliedMigrations();
    const appliedMap = new Map(applied.map((m) => [m.version, m]));

    const status = [];
    for (const migration of all) {
      const record = appliedMap.get(migration.version);
      const sql = await readFile(migration.upPath, 'utf-8');
      const currentChecksum = computeChecksum(sql);

      status.push({
        version: migration.version,
        name: migration.name,
        applied: !!record,
        applied_at: record?.applied_at || null,
        has_down: !!migration.downPath,
        checksum_match: record ? record.checksum === currentChecksum : null,
      });
    }

    return {
      total: all.length,
      applied: applied.length,
      pending: all.length - applied.length,
      migrations: status,
    };
  }

  /**
   * Run seed files from the seeds directory.
   *
   * @returns {Promise<string[]>} List of applied seed filenames
   */
  async seed() {
    if (!this.seedsDir) {
      this.logger('No seeds directory configured.');
      return [];
    }

    const files = await readdir(this.seedsDir);
    const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort();

    if (sqlFiles.length === 0) {
      this.logger('No seed files found.');
      return [];
    }

    const applied = [];
    for (const file of sqlFiles) {
      const sql = await readFile(join(this.seedsDir, file), 'utf-8');
      const statements = splitStatements(sql);

      if (this.dryRun) {
        this.logger(`[dry-run] Would apply seed: ${file} (${statements.length} statements)`);
        applied.push(file);
        continue;
      }

      this.logger(`Applying seed: ${file}`);
      for (const stmt of statements) {
        await this.db.exec(stmt);
      }
      applied.push(file);
    }

    return applied;
  }

  /**
   * Validate that all migration SQL files are parseable.
   * Used in CI to catch syntax issues before deployment.
   *
   * @returns {Promise<{ valid: boolean, errors: Array<{ file: string, error: string }> }>}
   */
  async validate() {
    const all = await this.discoverMigrations();
    const errors = [];

    for (const migration of all) {
      try {
        const sql = await readFile(migration.upPath, 'utf-8');
        const statements = splitStatements(sql);
        if (statements.length === 0) {
          errors.push({ file: migration.filename, error: 'Empty migration file' });
        }
      } catch (err) {
        errors.push({ file: migration.filename, error: err.message });
      }

      if (migration.downPath) {
        try {
          const sql = await readFile(migration.downPath, 'utf-8');
          const statements = splitStatements(sql);
          if (statements.length === 0) {
            errors.push({
              file: basename(migration.downPath),
              error: 'Empty down migration file',
            });
          }
        } catch (err) {
          errors.push({ file: basename(migration.downPath), error: err.message });
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Apply a single migration.
   *
   * @param {MigrationFile} migration
   * @returns {Promise<MigrationResult>}
   * @private
   */
  async _applyMigration(migration) {
    const sql = await readFile(migration.upPath, 'utf-8');
    const statements = splitStatements(sql);
    const checksum = computeChecksum(sql);

    if (this.dryRun) {
      this.logger(`[dry-run] Would apply: ${migration.version}_${migration.name}`);
      return {
        version: migration.version,
        name: migration.name,
        status: 'dry_run',
        execution_time_ms: 0,
        statements,
      };
    }

    this.logger(`Applying: ${migration.version}_${migration.name}`);
    const start = Date.now();

    for (const stmt of statements) {
      await this.db.exec(stmt);
    }

    const executionTime = Date.now() - start;

    await this.db
      .prepare(
        `INSERT INTO ${MIGRATIONS_TABLE} (version, name, checksum, execution_time_ms)
         VALUES (?, ?, ?, ?)`
      )
      .bind(migration.version, migration.name, checksum, executionTime)
      .run();

    this.logger(`Applied: ${migration.version}_${migration.name} (${executionTime}ms)`);

    return {
      version: migration.version,
      name: migration.name,
      status: 'applied',
      execution_time_ms: executionTime,
    };
  }

  /**
   * Rollback a single migration.
   *
   * @param {MigrationFile} migration
   * @returns {Promise<MigrationResult>}
   * @private
   */
  async _rollbackMigration(migration) {
    const sql = await readFile(migration.downPath, 'utf-8');
    const statements = splitStatements(sql);

    if (this.dryRun) {
      this.logger(`[dry-run] Would rollback: ${migration.version}_${migration.name}`);
      return {
        version: migration.version,
        name: migration.name,
        status: 'dry_run',
        execution_time_ms: 0,
        statements,
      };
    }

    this.logger(`Rolling back: ${migration.version}_${migration.name}`);
    const start = Date.now();

    for (const stmt of statements) {
      await this.db.exec(stmt);
    }

    const executionTime = Date.now() - start;

    await this.db
      .prepare(`DELETE FROM ${MIGRATIONS_TABLE} WHERE version = ?`)
      .bind(migration.version)
      .run();

    this.logger(`Rolled back: ${migration.version}_${migration.name} (${executionTime}ms)`);

    return {
      version: migration.version,
      name: migration.name,
      status: 'rolled_back',
      execution_time_ms: executionTime,
    };
  }
}
