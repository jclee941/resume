/**
 * @fileoverview Upserts synced application history into `applications`, keyed by
 * (source, job_id). One SELECT per source finds the existing rows (of any origin, including
 * auto-apply rows and the bare-id rows the old Wanted sync wrote); a row that exists only has its
 * status advanced and its application time filled in or made precise, a missing one is inserted
 * under a deterministic id, and nothing is deleted.
 * Writes go through D1 `batch` so hundreds of rows cost a handful of subrequests.
 * @module services/application-history/history-repository
 */
import { canonicalizeJobUrl } from '../../job-url-canonicalization.js';
import { HistorySyncError } from './history-types.js';

const BATCH_SIZE = 50;
const DATE_ONLY_LENGTH = 10;
/** SQL form of improvesAppliedAt, with ?4 the incoming application time. */
const IMPROVES_APPLIED_AT = `(?4 IS NOT NULL AND (applied_at IS NULL OR (length(applied_at) = ${DATE_ONLY_LENGTH} AND length(?4) > ${DATE_ONLY_LENGTH})))`;

/**
 * @typedef {{
 *   bind(...values: unknown[]): HistoryStatement;
 *   all(): Promise<{ results?: unknown[] }>;
 * }} HistoryStatement
 *
 * @typedef {{
 *   prepare(query: string): HistoryStatement;
 *   batch(statements: unknown[]): Promise<Array<{ meta: { changes: number } }>>;
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
 * A known application time fills a missing one, and a full timestamp replaces a bare date (JobKorea
 * rows synced before the list's time stamp was read); a precise time is never replaced by a date.
 * @param {string | null | undefined} stored
 * @param {string | null | undefined} incoming
 * @returns {boolean}
 */
function improvesAppliedAt(stored, incoming) {
  if (!incoming) return false;
  return !stored || (stored.length === DATE_ONLY_LENGTH && incoming.length > DATE_ONLY_LENGTH);
}

/**
 * @param {HistoryDb} db
 * @param {string} source
 * @returns {Promise<Map<string, { id: string; status: string; appliedAt: string | null; canonical: boolean }>>}
 */
async function loadExisting(db, source) {
  const { results = [] } = await db
    .prepare(
      'SELECT id, job_id, status, applied_at FROM applications WHERE source = ? AND job_id IS NOT NULL'
    )
    .bind(source)
    .all();
  const existing = new Map();
  for (const row of /** @type {Array<{ id: string; job_id: string; status: string; applied_at: string | null }>} */ (
    results
  )) {
    const key = dedupeKey(source, row.job_id);
    if (!key) continue;
    const canonical = row.job_id === key;
    const seen = existing.get(key);
    if (!seen || (canonical && !seen.canonical)) {
      existing.set(key, { id: row.id, status: row.status, appliedAt: row.applied_at, canonical });
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
 * @param {{ deadline?: number; clock?: () => number }} [window] no write batch starts at or after
 *   `deadline` (epoch ms); batches already written stay, and the next sync finishes the rest
 * @returns {Promise<UpsertCounts>}
 */
export async function upsertApplicationHistory(
  db,
  fetched,
  now,
  { deadline = Infinity, clock = Date.now } = {}
) {
  const records = latestPerJob(fetched);
  const counts = { fetched: fetched.length, inserted: 0, updated: 0, unchanged: 0 };
  if (records.length === 0) return counts;
  const existing = await loadExisting(db, records[0].source);
  // The job may have gained a row since loadExisting (the workflow records submissions under its
  // own id), so the insert checks (source, job_id) itself.
  const insert = db.prepare(
    `INSERT INTO applications (id, job_id, source, source_url, canonical_url, position, company, status, notes, created_at, updated_at, applied_at)
     SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12
     WHERE NOT EXISTS (SELECT 1 FROM applications WHERE source = ?3 AND job_id = ?2)
     ON CONFLICT(id) DO NOTHING`
  );
  // History rows keep created_at equal to the application time, so it moves with applied_at.
  const update = db.prepare(
    `UPDATE applications SET status = ?1, job_id = ?2, updated_at = ?3,
       applied_at = CASE WHEN ${IMPROVES_APPLIED_AT} THEN ?4 ELSE applied_at END,
       created_at = CASE WHEN ${IMPROVES_APPLIED_AT} AND created_at = applied_at THEN ?4 ELSE created_at END
     WHERE id = ?5 AND (status != ?1 OR job_id IS NOT ?2 OR ${IMPROVES_APPLIED_AT})`
  );
  const updateByJob = db.prepare(
    `UPDATE applications SET status = ?1, updated_at = ?3,
       applied_at = CASE WHEN ${IMPROVES_APPLIED_AT} THEN ?4 ELSE applied_at END,
       created_at = CASE WHEN ${IMPROVES_APPLIED_AT} AND created_at = applied_at THEN ?4 ELSE created_at END
     WHERE source = ?5 AND job_id = ?2 AND (status != ?1 OR ${IMPROVES_APPLIED_AT})`
  );
  const normalize = db.prepare(
    'UPDATE applications SET job_id = ? WHERE id = ? AND job_id IS NOT ?'
  );
  /** @type {unknown[]} */
  const statements = [];
  /** @type {Array<{ outcome: 'inserted' | 'updated'; record: import('./history-types.js').HistoryRecord }>} */
  const planned = [];
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
      planned.push({ outcome: 'inserted', record });
    } else if (row.status !== record.status || improvesAppliedAt(row.appliedAt, record.appliedAt)) {
      statements.push(update.bind(record.status, record.jobId, now, record.appliedAt, row.id));
      planned.push({ outcome: 'updated', record });
    } else if (!row.canonical) {
      statements.push(normalize.bind(record.jobId, row.id, record.jobId));
      planned.push({ outcome: 'updated', record });
    } else {
      counts.unchanged += 1;
    }
  }
  // A concurrent sync may have written the same row after the SELECT, so the counts come from
  // what each statement actually changed: a guarded no-op changes 0 rows. An insert that hit a
  // row another sync created meanwhile is retried as a guarded update, so its status is not lost.
  /** @type {unknown[]} */
  const retries = [];
  const total = Math.ceil(statements.length / BATCH_SIZE);
  /** @param {number} done */
  const assertWindowOpen = (done) => {
    if (clock() < deadline) return;
    throw new HistorySyncError(
      'TIMEOUT',
      `history write window closed after ${done} of ${total} write batches`
    );
  };
  for (let start = 0; start < statements.length; start += BATCH_SIZE) {
    assertWindowOpen(start / BATCH_SIZE);
    const results = await db.batch(statements.slice(start, start + BATCH_SIZE));
    results.forEach((result, index) => {
      const { outcome, record } = planned[start + index];
      if (result.meta.changes > 0) counts[outcome] += 1;
      else if (outcome === 'updated') counts.unchanged += 1;
      else {
        retries.push(
          updateByJob.bind(record.status, record.jobId, now, record.appliedAt, record.source)
        );
      }
    });
  }
  for (let start = 0; start < retries.length; start += BATCH_SIZE) {
    assertWindowOpen(total);
    const results = await db.batch(retries.slice(start, start + BATCH_SIZE));
    for (const result of results) counts[result.meta.changes > 0 ? 'updated' : 'unchanged'] += 1;
  }
  return counts;
}
