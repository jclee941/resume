import { readFileSync } from 'fs';

import { SessionManager } from '../shared/services/session/index.js';

// Platforms with a working browser-based apply strategy (applyTo<Platform>) and
// per-platform cookie/session loading. saramin + jobkorea are the user's
// requested platforms; wanted is also supported via its strategy.
const SUPPORTED_PLATFORMS = new Set(['jobkorea', 'saramin', 'wanted']);

/**
 * Normalize a curated submit-queue entry into the shape the apply strategies expect.
 * The queue stores {company, position, source, url, ...}; strategies read
 * {source, company, title, sourceUrl}.
 *
 * @param {object} entry - curated queue entry
 * @returns {{source: string, company: string, title: string, sourceUrl: string, id: string}}
 */
export function normalizeQueueEntry(entry) {
  const source = entry.source || entry.loginPlatform || '';
  return {
    id: entry.id || `${source}_${entry.url || entry.position || ''}`,
    source,
    company: entry.company || '',
    title: entry.position || entry.title || '',
    sourceUrl: entry.url || entry.sourceUrl || '',
  };
}

/**
 * Decide, without submitting, whether a queue entry can actually be applied to.
 * Returns a structured reason so the caller can report honestly.
 *
 * @param {object} job - normalized job
 * @param {object} [deps]
 * @param {(platform: string) => {valid: boolean, reason?: string}} [deps.checkHealth]
 * @returns {{ok: boolean, reason?: string}}
 */
export function assessQueueEntry(job, deps = {}) {
  const checkHealth = deps.checkHealth || ((p) => SessionManager.checkHealth(p));

  if (!job.source) {
    return { ok: false, reason: 'missing_source' };
  }
  if (!SUPPORTED_PLATFORMS.has(job.source)) {
    return { ok: false, reason: `unsupported_platform:${job.source}` };
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
 * @param {object} [deps]
 * @returns {{submittable: object[], blocked: {job: object, reason: string}[]}}
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
 * @param {object} params
 * @param {string} params.queuePath
 * @param {object} params.applier - AutoApplier instance (applyToJob, initBrowser...)
 * @param {boolean} [params.dryRun=true]
 * @param {number} [params.max]
 * @param {object} [params.logger=console]
 * @param {object} [deps]
 * @returns {Promise<{planned:number, submittable:number, applied:object[], blocked:object[], dryRun:boolean}>}
 */
export async function runQueueApply(params, deps = {}) {
  const { queuePath, applier, dryRun = true, max, logger = console } = params;
  const plan = planQueueApply(queuePath, deps);

  let submittable = plan.submittable;
  if (typeof max === 'number' && max >= 0) {
    submittable = submittable.slice(0, max);
  }

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
      result.applied.push({ job, success: false, error: error.message });
    }
  }
  return result;
}
