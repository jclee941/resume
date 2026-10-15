/**
 * @fileoverview Upserts public-sector postings into D1 `job_search_results` under the ids
 * `alio-<idx>`, `cleaneye-<year>-<entity>-<seq>` and `gojobs-<sn>`. New rows start as `new`. A row
 * already moved off `new` (a review's `recommended`/`ineligible`, or the owner's own status) keeps
 * its status and every curated field; only its address, deadline and crawl time are refreshed.
 * @module services/public-jobs/repository
 */
import { canonicalizeJobUrl } from '../../job-url-canonicalization.js';

const UPSERT_SQL = `INSERT INTO job_search_results (
  id, source, source_url, canonical_url, position, company, location, description,
  tech_stack, experience_level, match_score, status, crawled_at, expires_at, created_at, updated_at
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?)
ON CONFLICT (id) DO UPDATE SET
  source_url = excluded.source_url,
  canonical_url = excluded.canonical_url,
  expires_at = excluded.expires_at,
  crawled_at = excluded.crawled_at,
  updated_at = excluded.updated_at,
  position = CASE WHEN job_search_results.status = 'new' THEN excluded.position ELSE job_search_results.position END,
  company = CASE WHEN job_search_results.status = 'new' THEN excluded.company ELSE job_search_results.company END,
  location = CASE WHEN job_search_results.status = 'new' THEN excluded.location ELSE job_search_results.location END,
  description = CASE WHEN job_search_results.status = 'new' THEN excluded.description ELSE job_search_results.description END,
  tech_stack = CASE WHEN job_search_results.status = 'new' THEN excluded.tech_stack ELSE job_search_results.tech_stack END,
  experience_level = CASE WHEN job_search_results.status = 'new' THEN excluded.experience_level ELSE job_search_results.experience_level END,
  match_score = CASE WHEN job_search_results.status = 'new' THEN excluded.match_score ELSE job_search_results.match_score END`;

const BATCH_SIZE = 50;

/**
 * @typedef {'alio' | 'cleaneye' | 'gojobs'} PublicJobSourceId
 * @typedef {{
 *   id: string;
 *   source: PublicJobSourceId;
 *   url: string;
 *   title: string;
 *   company: string;
 *   location: string | null;
 *   description: string;
 *   terms: string[];
 *   career: string | null;
 *   score: number;
 *   deadline: string | null;
 * }} PublicPosting
 * @typedef {{
 *   prepare(sql: string): { bind(...values: unknown[]): unknown };
 *   batch(statements: unknown[]): Promise<unknown>;
 * }} D1Like
 */

/**
 * @param {Date} date
 * @returns {string} UTC "YYYY-MM-DD HH:MM:SS", the format SQLite datetime('now') writes
 */
function sqlTimestamp(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * @param {D1Like} db
 * @param {PublicPosting[]} postings
 * @param {Date} now
 * @returns {Promise<number>} rows written (inserted or refreshed)
 */
export async function upsertPublicPostings(db, postings, now) {
  if (postings.length === 0) return 0;
  const stamp = sqlTimestamp(now);
  const statement = db.prepare(UPSERT_SQL);
  const bound = postings.map((posting) =>
    statement.bind(
      posting.id,
      posting.source,
      posting.url,
      canonicalizeJobUrl(posting.url),
      posting.title,
      posting.company,
      posting.location,
      posting.description,
      JSON.stringify(posting.terms),
      posting.career,
      posting.score,
      stamp,
      posting.deadline,
      stamp,
      stamp
    )
  );
  for (let index = 0; index < bound.length; index += BATCH_SIZE) {
    await db.batch(bound.slice(index, index + BATCH_SIZE));
  }
  return bound.length;
}
