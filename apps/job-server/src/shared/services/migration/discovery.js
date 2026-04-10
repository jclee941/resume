/**
 * Migration Discovery Utilities
 * @module migration/discovery
 */
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

export const MIGRATIONS_TABLE = '_migrations';

export function computeChecksum(content) {
  let hash = 0;
  for (let i = 0; i < content.length; i++) hash = ((hash << 5) - hash + content.charCodeAt(i)) | 0;
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export function parseMigrationFilename(filename) {
  const m = filename.match(/^(\d{4})_(.+)\.sql$/);
  return m ? { version: m[1], name: m[2] } : null;
}

export function splitStatements(sql) {
  return sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));
}

export async function discoverMigrations(migrationsDir) {
  const files = await readdir(migrationsDir);
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

export async function getAppliedMigrations(db) {
  const r = await db.prepare(`SELECT * FROM ${MIGRATIONS_TABLE} ORDER BY version ASC`).all();
  return r.results || [];
}

export async function getPendingMigrations(migrationsDir, db) {
  const all = await discoverMigrations(migrationsDir);
  const applied = await getAppliedMigrations(db);
  const versions = new Set(applied.map((m) => m.version));
  return all.filter((m) => !versions.has(m.version));
}
