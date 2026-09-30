/**
 * @fileoverview Upserts synced application history into `applications`, keyed by
 * (source, job_id). One SELECT per source finds the existing rows (of any origin, including
 * auto-apply rows and the bare-id rows the old Wanted sync wrote); a row that exists only has its
 * status advanced, a missing one is inserted under a deterministic id, and nothing is deleted.
 * Writes go through D1 `batch` so hundreds of rows cost a handful of subrequests.
 * @module services/application-history/history-repository
 */
import { canonicalizeJobUrl } from '../../job-url-canonicalization.js';

const BATCH_SIZE = 50;

/**
 * @typedef {{
 *   bind(...values: unknown[]): HistoryStatement;
 *   all(): Promise<{ results?: unknown[] }>;
 * }} HistoryStatement
 *
 * @typedef {{
 *   prepare(query: string): HistoryStatement;
 *   batch(statements: unknown[]): Promise<unknown>;
 * }} HistoryDb
 *
 * @typedef {{ fetched: number; inserted: number; updated: number; unchanged: number }} UpsertCounts
 */

/**
 * @param {string} source
 * @param {string | null | undefined} jobId
 * @returns {string | null}
 */
function dedupeKey(source, jobId) {
  if (!jobId) return null;
  return jobId.startsWith(`${source}-`) ? jobId : `${source}-${jobId}`;
}

/**
 * @param {HistoryDb} db
 * @param {string} source
 * @returns {Promise<Map<string, { id: string; status: string; canonical: boolean }>>}
 */
async function loadExisting(db, source) {
  const { results = [] } = await db
    .prepare('SELECT id, job_id, status FROM applications WHERE source = ? AND job_id IS NOT NULL')
    .bind(source)
    .all();
  const existing = new Map();
  for (const row of /** @type {Array<{ id: string; job_id: string; status: string }>} */ (
    results
  )) {
    const key = dedupeKey(source, row.job_id);
    if (!key) continue;
    const canonical = row.job_id === key;
    const seen = existing.get(key);
    if (!seen || (canonical && !seen.canonical)) {
      existing.set(key, { id: row.id, status: row.status, canonical });
    }
  }
  return existing;
}

/**
 * A job applied to more than once yields several records with one job_id; the latest
 * application describes it (the first one wins a tie).
 * @param {import('./history-types.js').HistoryRecord[]} records
 * @returns {import('./history-types.js').HistoryRecord[]}
 */
function latestPerJob(records) {
  /** @type {Map<string, import('./history-types.js').HistoryRecord>} */
  const byJob = new Map();
  for (const record of records) {
    const seen = byJob.get(record.jobId);
    if (!seen || (record.appliedAt ?? '') > (seen.appliedAt ?? '')) byJob.set(record.jobId, record);
  }
  return [...byJob.values()];
}

/**
 * @param {HistoryDb} db
 * @param {import('./history-types.js').HistoryRecord[]} fetched records of one source
 * @param {string} now ISO timestamp
 * @returns {Promise<UpsertCounts>}
 */
export async function upsertApplicationHistory(db, fetched, now) {
  const records = latestPerJob(fetched);
  const counts = { fetched: fetched.length, inserted: 0, updated: 0, unchanged: 0 };
  if (records.length === 0) return counts;
  const existing = await loadExisting(db, records[0].source);
  const insert = db.prepare(
    `INSERT INTO applications (id, job_id, source, source_url, canonical_url, position, company, status, notes, created_at, updated_at, applied_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const update = db.prepare(
    'UPDATE applications SET status = ?, job_id = ?, updated_at = ?, applied_at = COALESCE(applied_at, ?) WHERE id = ?'
  );
  const normalize = db.prepare('UPDATE applications SET job_id = ? WHERE id = ?');
  const statements = [];
  for (const record of records) {
    const row = existing.get(record.jobId);
    if (!row) {
      statements.push(
        insert.bind(
          `history-${record.jobId}`,
          record.jobId,
          record.source,
          record.url,
          canonicalizeJobUrl(record.url),
          record.position,
          record.company,
          record.status,
          `Synced from ${record.source} application history`,
          record.appliedAt ?? now,
          now,
          record.appliedAt
        )
      );
      counts.inserted += 1;
    } else if (row.status !== record.status) {
      statements.push(update.bind(record.status, record.jobId, now, record.appliedAt, row.id));
      counts.updated += 1;
    } else if (!row.canonical) {
      statements.push(normalize.bind(record.jobId, row.id));
      counts.updated += 1;
    } else {
      counts.unchanged += 1;
    }
  }
  for (let start = 0; start < statements.length; start += BATCH_SIZE) {
    await db.batch(statements.slice(start, start + BATCH_SIZE));
  }
  return counts;
}
