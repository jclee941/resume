import { execSync } from 'node:child_process';
import chalk from 'chalk';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const DB_NAME = 'job-dashboard-db';
const MIGRATIONS_DIR = resolve(process.cwd(), 'infrastructure/database/migrations');
const SEEDS_DIR = resolve(process.cwd(), 'infrastructure/database/seeds');

/**
 * Execute a wrangler D1 command.
 * @param {string} sql - SQL to execute
 * @param {{ env?: string, dryRun?: boolean }} options
 * @returns {string} Command output
 */
function executeD1(sql, options = {}) {
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
    throw new Error(`D1 execution failed: ${err.stderr || err.message}`);
  }
}

/**
 * Execute a SQL file via wrangler D1.
 * @param {string} filePath - Path to .sql file
 * @param {{ env?: string, dryRun?: boolean }} options
 * @returns {string} Command output
 */
function executeD1File(filePath, options = {}) {
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
    throw new Error(`D1 file execution failed: ${err.stderr || err.message}`);
  }
}

/**
 * Ensure the _migrations tracking table exists.
 * @param {{ env?: string, dryRun?: boolean }} options
 */
function ensureMigrationsTable(options) {
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
function getAppliedMigrations(options) {
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
function getPendingMigrations(applied) {
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
function computeChecksum(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Run pending migrations.
 * @param {{ env?: string, dryRun?: boolean }} options
 */
export async function migrate(options = {}) {
  console.log(chalk.blue('\n📦 D1 Migration Runner\n'));

  if (options.dryRun) {
    console.log(chalk.yellow('🔸 DRY RUN MODE — no changes will be applied\n'));
  }

  const target = options.env || 'local';
  console.log(chalk.gray(`  Target: ${target}`));
  console.log(chalk.gray(`  Database: ${DB_NAME}\n`));

  ensureMigrationsTable(options);

  const applied = options.dryRun ? [] : getAppliedMigrations(options);
  const pending = getPendingMigrations(applied);

  if (pending.length === 0) {
    console.log(chalk.green('✅ Database is up to date — no pending migrations\n'));
    return;
  }

  console.log(chalk.white(`  Found ${pending.length} pending migration(s):\n`));

  for (const migration of pending) {
    const checksum = computeChecksum(migration.path);
    console.log(chalk.cyan(`  ▶ Applying: ${migration.name}`));

    try {
      executeD1File(migration.path, options);

      if (!options.dryRun) {
        const recordSql = `INSERT INTO _migrations (name, checksum) VALUES ('${migration.name}', '${checksum}')`;
        executeD1(recordSql, options);
      }

      console.log(chalk.green('    ✅ Applied successfully'));
    } catch (err) {
      console.error(chalk.red(`    ❌ Failed: ${err.message}`));
      console.error(chalk.red('\n⛔ Migration aborted. Fix the error and retry.\n'));
      process.exit(1);
    }
  }

  console.log(chalk.green(`\n✅ Applied ${pending.length} migration(s) successfully\n`));
}

/**
 * Rollback the last N migrations.
 * @param {{ env?: string, dryRun?: boolean, steps?: number }} options
 */
export async function rollback(options = {}) {
  const steps = options.steps || 1;
  console.log(chalk.blue(`\n⏪ Rolling back ${steps} migration(s)\n`));

  if (options.dryRun) {
    console.log(chalk.yellow('🔸 DRY RUN MODE — no changes will be applied\n'));
  }

  ensureMigrationsTable(options);
  const applied = getAppliedMigrations(options);

  if (applied.length === 0) {
    console.log(chalk.yellow('⚠️  No migrations to rollback\n'));
    return;
  }

  const toRollback = applied.slice(-steps).reverse();

  for (const name of toRollback) {
    const downFile = join(MIGRATIONS_DIR, name.replace('.sql', '.down.sql'));

    if (!existsSync(downFile)) {
      console.error(chalk.red(`  ❌ No down migration found: ${downFile}`));
      console.error(chalk.red('  ⛔ Rollback aborted.\n'));
      process.exit(1);
    }

    console.log(chalk.cyan(`  ▶ Rolling back: ${name}`));

    try {
      executeD1File(downFile, options);

      if (!options.dryRun) {
        executeD1(`DELETE FROM _migrations WHERE name = '${name}'`, options);
      }

      console.log(chalk.green('    ✅ Rolled back successfully'));
    } catch (err) {
      console.error(chalk.red(`    ❌ Failed: ${err.message}`));
      process.exit(1);
    }
  }

  console.log(chalk.green(`\n✅ Rolled back ${toRollback.length} migration(s)\n`));
}

/**
 * Show migration status.
 * @param {{ env?: string }} options
 */
export async function status(options = {}) {
  console.log(chalk.blue('\n📋 Migration Status\n'));

  ensureMigrationsTable(options);
  const applied = getAppliedMigrations(options);

  if (!existsSync(MIGRATIONS_DIR)) {
    console.log(chalk.yellow('⚠️  No migrations directory found\n'));
    return;
  }

  const allFiles = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql') && !f.endsWith('.down.sql'))
    .sort();

  if (allFiles.length === 0) {
    console.log(chalk.yellow('⚠️  No migration files found\n'));
    return;
  }

  const maxNameLen = Math.max(...allFiles.map((f) => f.length));

  for (const file of allFiles) {
    const isApplied = applied.includes(file);
    const downExists = existsSync(join(MIGRATIONS_DIR, file.replace('.sql', '.down.sql')));
    const marker = isApplied ? chalk.green('✅ applied') : chalk.yellow('⏳ pending');
    const downMarker = downExists ? chalk.gray(' [↩ down]') : '';
    console.log(`  ${file.padEnd(maxNameLen + 2)}${marker}${downMarker}`);
  }

  const pending = allFiles.length - applied.length;
  console.log('');
  console.log(
    chalk.gray(`  Total: ${allFiles.length} | Applied: ${applied.length} | Pending: ${pending}\n`)
  );
}

/**
 * Run seed data files.
 * @param {{ env?: string, dryRun?: boolean }} options
 */
export async function seed(options = {}) {
  console.log(chalk.blue('\n🌱 Running seed data\n'));

  if (!existsSync(SEEDS_DIR)) {
    console.log(chalk.yellow('⚠️  No seeds directory found\n'));
    return;
  }

  const seedFiles = readdirSync(SEEDS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (seedFiles.length === 0) {
    console.log(chalk.yellow('⚠️  No seed files found\n'));
    return;
  }

  for (const file of seedFiles) {
    console.log(chalk.cyan(`  ▶ Seeding: ${file}`));
    try {
      executeD1File(join(SEEDS_DIR, file), options);
      console.log(chalk.green('    ✅ Done'));
    } catch (err) {
      console.error(chalk.red(`    ❌ Failed: ${err.message}`));
      process.exit(1);
    }
  }

  console.log(chalk.green('\n✅ Seed data applied\n'));
}

/**
 * Create a new migration file.
 * @param {string} name - Migration description (e.g., "add_users_table")
 */
export async function create(name) {
  if (!name) {
    console.error(chalk.red('❌ Migration name is required'));
    console.log(chalk.gray('  Usage: resume-cli db create <name>'));
    console.log(chalk.gray('  Example: resume-cli db create add_users_table'));
    process.exit(1);
  }

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

  const { writeFileSync, mkdirSync } = await import('node:fs');
  mkdirSync(MIGRATIONS_DIR, { recursive: true });

  writeFileSync(
    upFile,
    `-- Migration: ${nextNum}_${sanitized}\n-- Created: ${new Date().toISOString()}\n\n`
  );
  writeFileSync(
    downFile,
    `-- Rollback: ${nextNum}_${sanitized}\n-- Created: ${new Date().toISOString()}\n\n`
  );

  console.log(chalk.green('\n✅ Created migration files:'));
  console.log(chalk.cyan(`  Up:   ${upFile}`));
  console.log(chalk.cyan(`  Down: ${downFile}\n`));
}
