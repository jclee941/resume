/**
 * @fileoverview Collects open public-sector and big-tech IT/security postings into D1
 * `job_search_results`. Runs from the hourly cron at PUBLIC_JOBS_HOURS_UTC and on
 * demand (POST /api/public-jobs/collect). Sources are independent: a failing source is reported
 * and the others still save. Detail pages are read only for candidates, at most `detailBudget`
 * per source, which keeps a run far below the Worker subrequest limit.
 * @module services/public-jobs/collect
 */
import { collectAlio } from './alio.js';
import { BIGTECH_COLLECTORS } from '../bigtech-jobs/index.js';
import { collectCleaneye } from './cleaneye.js';
import { collectGojobs } from './gojobs.js';
import { enqueuePublicJobNotifications } from './notifications.js';
import { upsertPublicPostings } from './repository.js';
import { kstDate } from './text.js';

export const PUBLIC_JOB_SOURCES = /** @type {const} */ ([
  'alio',
  'cleaneye',
  'gojobs',
  'amazon',
  'line',
  'naver',
  'daangn',
  'kakao',
]);
export const DEFAULT_DETAIL_BUDGET = 80;

const COLLECTORS = {
  alio: collectAlio,
  cleaneye: collectCleaneye,
  gojobs: collectGojobs,
  ...BIGTECH_COLLECTORS,
};

/**
 * @typedef {typeof PUBLIC_JOB_SOURCES[number]} PublicJobSource
 * @typedef {{ listed: number; candidates: number; failed: number; saved: number } | { error: string }} SourceOutcome
 * @typedef {{
 *   status: 'success' | 'partial' | 'failed';
 *   collectedAt: string;
 *   sources: Partial<Record<PublicJobSource, SourceOutcome>>;
 *   notifications?: import('./notifications.js').PublicJobNotificationSummary;
 * }} CollectSummary
 * @typedef {{ JOB_DB: import('./repository.js').D1Like } & import('./notifications.js').PublicJobNotificationEnv} CollectEnv
 * @typedef {{
 *   fetcher?: import('./text.js').Fetcher;
 *   clock?: () => Date;
 *   sources?: readonly PublicJobSource[];
 *   detailBudget?: number;
 * }} CollectOptions
 */

/**
 * @param {CollectEnv} env
 * @param {CollectOptions} [options]
 * @returns {Promise<CollectSummary>}
 */
export async function collectPublicJobs(env, options = {}) {
  const {
    fetcher = fetch,
    clock = () => new Date(),
    sources = PUBLIC_JOB_SOURCES,
    detailBudget = DEFAULT_DETAIL_BUDGET,
  } = options;
  const now = clock();
  const today = kstDate(now);
  /** @type {CollectSummary['sources']} */
  const outcomes = {};
  /** @type {import('./repository.js').PublicPosting[]} */
  const postings = [];
  for (const source of sources) {
    try {
      const harvest = await COLLECTORS[source](fetcher, { today, budget: detailBudget });
      const saved = await upsertPublicPostings(env.JOB_DB, harvest.postings, now);
      postings.push(...harvest.postings);
      const { listed, candidates, failed } = harvest;
      outcomes[source] = { listed, candidates, failed, saved };
    } catch (error) {
      outcomes[source] = { error: error instanceof Error ? error.message : String(error) };
    }
  }
  const notifications = env.NOTIFICATION_QUEUE
    ? await enqueuePublicJobNotifications(env, postings, now)
    : undefined;
  const errors = Object.values(outcomes).filter((outcome) => 'error' in outcome).length;
  const status =
    errors === 0 && !notifications?.failed
      ? 'success'
      : errors === sources.length
        ? 'failed'
        : 'partial';
  return {
    status,
    collectedAt: now.toISOString(),
    sources: outcomes,
    ...(notifications ? { notifications } : {}),
  };
}
