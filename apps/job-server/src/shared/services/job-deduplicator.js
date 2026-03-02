import { createHash } from 'crypto';

/**
 * Job deduplicator service.
 * Hash-based deduplication using job URL + title + company with configurable TTL.
 */

/** @type {Map<string, {hash: string, firstSeen: number, source: string}>} */
const seenJobs = new Map();

/** Default TTL: 7 days in milliseconds */
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Generate a deduplication hash for a job.
 * @param {Object} job - Job object
 * @param {string} [job.url] - Job URL
 * @param {string} [job.title] - Job title
 * @param {string} [job.company] - Company name
 * @returns {string} SHA-256 hash
 */
export function generateJobHash(job) {
  const normalized = [
    (job.url || '').toLowerCase().trim(),
    (job.title || '').toLowerCase().trim(),
    (job.company || '').toLowerCase().trim(),
  ].join('|');

  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

/**
 * Check if a job has been seen before (is a duplicate).
 * @param {Object} job - Job object with url, title, company
 * @returns {boolean} True if duplicate
 */
export function isDuplicate(job) {
  const hash = generateJobHash(job);
  return seenJobs.has(hash);
}

/**
 * Mark a job as seen.
 * @param {Object} job - Job object
 * @returns {string} The hash key used
 */
export function markSeen(job) {
  const hash = generateJobHash(job);
  seenJobs.set(hash, {
    hash,
    firstSeen: Date.now(),
    source: job.source || 'unknown',
  });
  return hash;
}

/**
 * Deduplicate an array of jobs, returning only unseen ones.
 * Automatically marks returned jobs as seen.
 * @param {Object[]} jobs - Array of job objects
 * @returns {Object[]} Deduplicated jobs (new ones only)
 */
export function deduplicateJobs(jobs) {
  const unique = [];
  for (const job of jobs) {
    if (!isDuplicate(job)) {
      markSeen(job);
      unique.push(job);
    }
  }
  return unique;
}

/**
 * Purge expired entries from the dedup cache.
 * @param {number} [ttlMs] - TTL in milliseconds (default: 7 days)
 * @returns {number} Number of entries purged
 */
export function purgeExpired(ttlMs = DEFAULT_TTL_MS) {
  const cutoff = Date.now() - ttlMs;
  let purged = 0;
  for (const [hash, entry] of seenJobs) {
    if (entry.firstSeen < cutoff) {
      seenJobs.delete(hash);
      purged++;
    }
  }
  return purged;
}

/**
 * Get deduplication stats.
 * @returns {{totalTracked: number, bySource: Object<string, number>}}
 */
export function getDeduplicationStats() {
  const bySource = {};
  for (const entry of seenJobs.values()) {
    bySource[entry.source] = (bySource[entry.source] || 0) + 1;
  }
  return { totalTracked: seenJobs.size, bySource };
}

/**
 * Clear all dedup state.
 */
export function clearAll() {
  seenJobs.clear();
}
