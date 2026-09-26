/**
 * Migration Discovery Utilities
 * @module migration/discovery
 */
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

export const MIGRATIONS_TABLE = '_migrations';

/**
 * @typedef {{
 *   version: string;
 *   name: string;
 *   filename: string;
 *   upPath: string;
 *   downPath: string | null;
 * }} DiscoveredMigration
 *
 * @typedef {{
 *   version: string;
 *   [key: string]: unknown;
 * }} AppliedMigrationRecord
 *
 * @typedef {{
 *   prepare(sql: string): {
 *     all(): Promise<{ results?: AppliedMigrationRecord[] }>;
 *   };
 * }} MigrationDatabase
 */

/**
 * @param {string} content
 * @returns {string}
 */
export function computeChecksum(content) {
  let hash = 0;
  for (let i = 0; i < content.length; i++) hash = ((hash << 5) - hash + content.charCodeAt(i)) | 0;
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * @param {string} filename
 * @returns {{ version: string; name: string } | null}
 */
export function parseMigrationFilename(filename) {
  const m = filename.match(/^(\d{4})_(.+)\.sql$/);
  return m ? { version: m[1], name: m[2] } : null;
}

/**
 * @param {string} sql
 * @returns {string[]}
 */
export function splitStatements(sql) {
  return sql
    .split(';')
    .map((/** @type {string} */ s) => s.trim())
    .filter((/** @type {string} */ s) => s.length > 0 && !s.startsWith('--'));
}

/**
 * @param {string} migrationsDir
 * @returns {Promise<DiscoveredMigration[]>}
 */
export async function discoverMigrations(migrationsDir) {
  const files = await readdir(migrationsDir);
  /** @type {DiscoveredMigration[]} */
  const migrations = [];
  for (const file of files) {
    if (file.endsWith('.down.sql')) continue;
    const p = parseMigrationFilename(file);
    if (!p) continue;
    const downExists = files.includes(`${p.version}_${p.name}.down.sql`);
    migrations.push({
      version: p.version,
      name: p.name,
      filename: file,
      upPath: join(migrationsDir, file),
      downPath: downExists ? join(migrationsDir, `${p.version}_${p.name}.down.sql`) : null,
    });
  }
  return migrations.sort((a, b) => a.version.localeCompare(b.version));
}

/**
 * @param {MigrationDatabase} db
 * @returns {Promise<AppliedMigrationRecord[]>}
 */
export async function getAppliedMigrations(db) {
  const r = await db.prepare(`SELECT * FROM ${MIGRATIONS_TABLE} ORDER BY version ASC`).all();
  return r.results || [];
}

/**
 * @param {string} migrationsDir
 * @param {MigrationDatabase} db
 * @returns {Promise<DiscoveredMigration[]>}
 */
export async function getPendingMigrations(migrationsDir, db) {
  const all = await discoverMigrations(migrationsDir);
  const applied = await getAppliedMigrations(db);
  const versions = new Set(applied.map((/** @type {AppliedMigrationRecord} */ m) => m.version));
  return all.filter((m) => !versions.has(m.version));
}
