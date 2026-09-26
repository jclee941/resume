import { execSync } from 'node:child_process';
import chalk from 'chalk';
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

export const DB_NAME = 'job-dashboard-db';
export const MIGRATIONS_DIR = resolve(process.cwd(), 'infrastructure/database/migrations');
export const SEEDS_DIR = resolve(process.cwd(), 'infrastructure/database/seeds');

/**
 * Execute a wrangler D1 command.
 * @param {string} sql - SQL to execute
 * @param {{ env?: string, dryRun?: boolean }} options
 * @returns {string} Command output
 */
export function executeD1(sql, options = {}) {
  const envFlag = options.env ? `--env=${options.env}` : '';
  const remoteFlag = options.env ? '--remote' : '--local';

  if (options.dryRun) {
    console.log(chalk.yellow('  [DRY RUN] Would execute:'));
    console.log(chalk.gray(`  ${sql.slice(0, 200)}${sql.length > 200 ? '...' : ''}`));
    return '';
  }

  try {
    const cmd = `npx wrangler d1 execute ${DB_NAME} ${envFlag} ${remoteFlag} --command="${sql.replace(/"/g, '\\"')}"`;
    return execSync(cmd, {
      cwd: resolve(process.cwd(), 'apps/job-server/workers'),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err) {
    throw new Error(`D1 execution failed: ${err.stderr || err.message}`, { cause: err });
  }
}

/**
 * Execute a SQL file via wrangler D1.
 * @param {string} filePath - Path to .sql file
 * @param {{ env?: string, dryRun?: boolean }} options
 * @returns {string} Command output
 */
export function executeD1File(filePath, options = {}) {
  const envFlag = options.env ? `--env=${options.env}` : '';
  const remoteFlag = options.env ? '--remote' : '--local';

  if (options.dryRun) {
    const content = readFileSync(filePath, 'utf-8');
    console.log(chalk.yellow('  [DRY RUN] Would execute file:'), filePath);
    console.log(chalk.gray(`  ${content.slice(0, 300)}${content.length > 300 ? '...' : ''}`));
    return '';
  }

  try {
    const cmd = `npx wrangler d1 execute ${DB_NAME} ${envFlag} ${remoteFlag} --file="${filePath}"`;
    return execSync(cmd, {
      cwd: resolve(process.cwd(), 'apps/job-server/workers'),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err) {
    throw new Error(`D1 file execution failed: ${err.stderr || err.message}`, { cause: err });
  }
}

/**
 * Ensure the _migrations tracking table exists.
 * @param {{ env?: string, dryRun?: boolean }} options
 */
export function ensureMigrationsTable(options) {
  const sql = `CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL DEFAULT (datetime('now')),
    checksum TEXT
  )`;
  executeD1(sql, options);
}

/**
 * Get list of already-applied migrations from D1.
 * @param {{ env?: string }} options
 * @returns {string[]} Applied migration names
 */
export function getAppliedMigrations(options) {
  try {
    const result = executeD1('SELECT name FROM _migrations ORDER BY id', options);
    const matches = result.match(/"name":"([^"]+)"/g);
    if (!matches) return [];
    return matches.map((m) => m.replace(/"name":"([^"]+)"/, '$1'));
  } catch {
    return [];
  }
}

/**
 * Get pending migration files (not yet applied).
 * @returns {{ name: string, path: string }[]} Pending migrations
 */
export function getPendingMigrations(applied) {
  if (!existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  const allFiles = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql') && !f.endsWith('.down.sql'))
    .sort();

  return allFiles
    .filter((f) => !applied.includes(f))
    .map((f) => ({ name: f, path: join(MIGRATIONS_DIR, f) }));
}

/**
 * Compute a simple checksum for a file.
 * @param {string} filePath
 * @returns {string}
 */
export function computeChecksum(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Create new migration files on disk.
 * @param {string} name - Migration description
 * @returns {{ upFile: string, downFile: string }}
 */
export function createMigrationFiles(name) {
  const sanitized = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');

  const existing = existsSync(MIGRATIONS_DIR)
    ? readdirSync(MIGRATIONS_DIR)
        .filter((f) => f.endsWith('.sql') && !f.endsWith('.down.sql'))
        .sort()
    : [];

  const nextNum =
    existing.length > 0
      ? String(parseInt(existing[existing.length - 1].split('_')[0], 10) + 1).padStart(4, '0')
      : '0000';

  const upFile = join(MIGRATIONS_DIR, `${nextNum}_${sanitized}.sql`);
  const downFile = join(MIGRATIONS_DIR, `${nextNum}_${sanitized}.down.sql`);

  mkdirSync(MIGRATIONS_DIR, { recursive: true });

  writeFileSync(
    upFile,
    `-- Migration: ${nextNum}_${sanitized}\n-- Created: ${new Date().toISOString()}\n\n`
  );
  writeFileSync(
    downFile,
    `-- Rollback: ${nextNum}_${sanitized}\n-- Created: ${new Date().toISOString()}\n\n`
  );

  return { upFile, downFile };
}
