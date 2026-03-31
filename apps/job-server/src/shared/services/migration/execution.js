/**
 * Migration Execution
 * @module migration/execution
 */
import { readFile } from 'node:fs/promises';
import { computeChecksum, splitStatements, MIGRATIONS_TABLE } from './discovery.js';

export async function applyMigration(db, migration, dryRun, logger) {
  const sql = await readFile(migration.upPath, 'utf-8');
  const stmts = splitStatements(sql);
  const checksum = computeChecksum(sql);
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

export async function rollbackMigration(db, migration, dryRun, logger) {
  const sql = await readFile(migration.downPath, 'utf-8');
  const stmts = splitStatements(sql);
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

export { MIGRATIONS_TABLE };
