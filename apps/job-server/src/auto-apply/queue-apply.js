import { readFileSync } from 'fs';

import { SessionManager } from '../shared/services/session/index.js';
import { parseWantedJobId } from './strategies/wanted-id.js';

// Platforms with a working browser-based apply strategy (applyTo<Platform>) and
// per-platform cookie/session loading. saramin + jobkorea are the user's
// requested platforms; wanted is also supported via its strategy.
const SUPPORTED_PLATFORMS = new Set(['jobkorea', 'saramin', 'wanted']);

/**
 * @typedef {Object} RawQueueEntry
 * @property {string} [id]
 * @property {string} [source]
 * @property {string} [loginPlatform]
 * @property {string} [url]
 * @property {string} [sourceUrl]
 * @property {string} [position]
 * @property {string} [title]
 * @property {string} [company]
 */

/**
 * @typedef {Object} NormalizedQueueJob
 * @property {string} id
 * @property {string} source
 * @property {string} company
 * @property {string} title
 * @property {string} sourceUrl
 */

/**
 * @typedef {Object} QueueDeps
 * @property {(platform: string) => { valid: boolean; reason?: string }} [checkHealth]
 * @property {(path: string) => string} [readFile]
 */

/**
 * @typedef {Object} QueueBlockedItem
 * @property {NormalizedQueueJob} job
 * @property {string | undefined} reason
 */

/**
 * @typedef {Object} QueuePlan
 * @property {NormalizedQueueJob[]} submittable
 * @property {QueueBlockedItem[]} blocked
 */

/**
 * @typedef {Object} QueueAppliedResult
 * @property {NormalizedQueueJob} job
 * @property {boolean} success
 * @property {unknown} [error]
 */

/**
 * @typedef {Object} QueueApplier
 * @property {(job: NormalizedQueueJob) => Promise<{ success?: boolean; error?: unknown }>} applyToJob
 */

/**
 * @typedef {Object} RunQueueApplyParams
 * @property {string} queuePath
 * @property {QueueApplier} applier
 * @property {boolean} [dryRun]
 * @property {number} [max]
 * @property {{ info?: (msg: string) => void }} [logger]
 */

/**
 * @typedef {Object} RunQueueApplyResult
 * @property {number} planned
 * @property {number} submittable
 * @property {QueueAppliedResult[]} applied
 * @property {QueueBlockedItem[]} blocked
 * @property {boolean} dryRun
 */

/**
 * Normalize a curated submit-queue entry into the shape the apply strategies expect.
 * The queue stores {company, position, source, url, ...}; strategies read
 * {source, company, title, sourceUrl}.
 *
 * @param {RawQueueEntry} entry - curated queue entry
 * @returns {NormalizedQueueJob}
 */
export function normalizeQueueEntry(entry) {
  const source = entry.source || entry.loginPlatform || '';
  const id = entry.id || `${source}_${entry.url || entry.position || ''}`;
  const wantedJobId = source === 'wanted' ? parseWantedJobId(id) : null;
  return {
    id,
    source,
    company: entry.company || '',
    title: entry.position || entry.title || '',
    sourceUrl: wantedJobId
      ? `https://www.wanted.co.kr/wd/${wantedJobId}`
      : entry.url || entry.sourceUrl || '',
  };
}

/**
 * Decide, without submitting, whether a queue entry can actually be applied to.
 * Returns a structured reason so the caller can report honestly.
 *
 * @param {NormalizedQueueJob} job - normalized job
 * @param {QueueDeps} [deps]
 * @returns {{ok: boolean, reason?: string}}
 */
export function assessQueueEntry(job, deps = {}) {
  const checkHealth = deps.checkHealth || ((p) => SessionManager.checkHealth(p, undefined, true));

  if (!job.source) {
    return { ok: false, reason: 'missing_source' };
  }
  if (!SUPPORTED_PLATFORMS.has(job.source)) {
    return { ok: false, reason: `unsupported_platform:${job.source}` };
  }
  if (job.source === 'wanted' && parseWantedJobId(job.id) === null) {
    return { ok: false, reason: 'invalid_wanted_id' };
  }
  if (!job.sourceUrl) {
    return { ok: false, reason: 'missing_url' };
  }
  const health = checkHealth(job.source);
  if (!health || !health.valid) {
    return { ok: false, reason: `no_valid_session:${job.source}` };
  }
  return { ok: true };
}

/**
 * Build a plan from a curated queue file: which entries are submittable now,
 * and which are blocked and why. Pure (no submission, no browser).
 *
 * @param {string} queuePath - path to submit-queue.json
 * @param {QueueDeps} [deps]
 * @returns {QueuePlan}
 */
export function planQueueApply(queuePath, deps = {}) {
  const readFile = deps.readFile || ((p) => readFileSync(p, 'utf8'));
  const raw = JSON.parse(readFile(queuePath));
  const entries = Array.isArray(raw) ? raw : raw.candidates || [];

  const submittable = [];
  const blocked = [];
  for (const entry of entries) {
    const job = normalizeQueueEntry(entry);
    const verdict = assessQueueEntry(job, deps);
    if (verdict.ok) {
      submittable.push(job);
    } else {
      blocked.push({ job, reason: verdict.reason });
    }
  }
  return { submittable, blocked };
}

/**
 * Apply to exactly the curated queue entries. Submission only happens when
 * dryRun is false AND the platform session is valid. Unsupported platforms and
 * missing sessions are reported as blocked, never silently skipped.
 *
 * @param {RunQueueApplyParams} params
 * @param {QueueDeps} [deps]
 * @returns {Promise<RunQueueApplyResult>}
 */
export async function runQueueApply(params, deps = {}) {
  const { queuePath, applier, dryRun = true, max, logger = console } = params;
  const plan = planQueueApply(queuePath, deps);

  let submittable = plan.submittable;
  if (typeof max === 'number') {
    if (max < 0) {
      throw new RangeError('max must be non-negative');
    }
    submittable = submittable.slice(0, max);
  }

  /** @type {RunQueueApplyResult} */
  const result = {
    planned: plan.submittable.length + plan.blocked.length,
    submittable: submittable.length,
    applied: [],
    blocked: plan.blocked,
    dryRun,
  };

  if (dryRun) {
    for (const job of submittable) {
      logger.info?.(`[dry-run] would apply: [${job.source}] ${job.title} @ ${job.company}`);
    }
    return result;
  }

  for (const job of submittable) {
    try {
      const res = await applier.applyToJob(job);
      result.applied.push({ job, success: !!res?.success, error: res?.error });
    } catch (error) {
      result.applied.push({
        job,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return result;
}
