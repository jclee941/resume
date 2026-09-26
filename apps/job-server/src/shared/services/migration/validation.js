/**
 * Migration Validation
 * @module migration/validation
 */
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { discoverMigrations, splitStatements } from './discovery.js';

/**
 * @typedef {{
 *   file: string;
 *   error: string;
 * }} MigrationValidationError
 */

/**
 * @param {string} migrationsDir
 * @param {(...args: unknown[]) => void} [_logger]
 * @returns {Promise<{ valid: boolean; errors: MigrationValidationError[] }>}
 */
export async function validate(migrationsDir, _logger = console.log) {
  const all = await discoverMigrations(migrationsDir);
  /** @type {MigrationValidationError[]} */
  const errors = [];
  for (const m of all) {
    try {
      const stmts = splitStatements(await readFile(m.upPath, 'utf-8'));
      if (!stmts.length) errors.push({ file: m.filename, error: 'Empty migration file' });
    } catch (e) {
      errors.push({ file: m.filename, error: e instanceof Error ? e.message : String(e) });
    }
    if (m.downPath) {
      try {
        const stmts = splitStatements(await readFile(m.downPath, 'utf-8'));
        if (!stmts.length)
          errors.push({ file: basename(m.downPath), error: 'Empty down migration file' });
      } catch (e) {
        errors.push({
          file: basename(m.downPath),
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }
  return { valid: !errors.length, errors };
}
