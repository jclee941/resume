import chalk from 'chalk';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  DB_NAME,
  MIGRATIONS_DIR,
  SEEDS_DIR,
  executeD1,
  executeD1File,
  ensureMigrationsTable,
  getAppliedMigrations,
  getPendingMigrations,
  computeChecksum,
  createMigrationFiles,
} from './db-utils.js';

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

  const { upFile, downFile } = createMigrationFiles(name);

  console.log(chalk.green('\n✅ Created migration files:'));
  console.log(chalk.cyan(`  Up:   ${upFile}`));
  console.log(chalk.cyan(`  Down: ${downFile}\n`));
}
