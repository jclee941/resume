/**
 * Migration Validation
 * @module migration/validation
 */
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { discoverMigrations, splitStatements } from './discovery.js';

export async function validate(migrationsDir, logger = console.log) {
  const all = await discoverMigrations(migrationsDir);
  const errors = [];
  for (const m of all) {
    try {
      const stmts = splitStatements(await readFile(m.upPath, 'utf-8'));
      if (!stmts.length) errors.push({ file: m.filename, error: 'Empty migration file' });
    } catch (e) {
      errors.push({ file: m.filename, error: e.message });
    }
    if (m.downPath) {
      try {
        const stmts = splitStatements(await readFile(m.downPath, 'utf-8'));
        if (!stmts.length)
          errors.push({ file: basename(m.downPath), error: 'Empty down migration file' });
      } catch (e) {
        errors.push({ file: basename(m.downPath), error: e.message });
      }
    }
  }
  return { valid: !errors.length, errors };
}
