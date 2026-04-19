import { APPLY_MIN_SCORE, RELEVANT_MIN_SCORE, REVIEW_MIN_SCORE } from './constants.js';
import { summarizeError } from './logging.js';

export function createResult() {
  return {
    timestamp: new Date().toISOString(),
    searched: 0,
    unique: 0,
    scored: 0,
    relevant: 0,
    applied: 0,
    skipped: 0,
    failed: 0,
    dedupSkipped: 0,
    topJobs: [],
    appliedJobs: [],
    skippedJobs: [],
    failedJobs: [],
    sessionWarnings: [],
    wantedApplyEnabled: true,
    thresholds: {
      autoApply: APPLY_MIN_SCORE,
      review: REVIEW_MIN_SCORE,
      relevant: RELEVANT_MIN_SCORE,
    },
  };
}

export function mapTopJob(job) {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    score: job.score,
    url: job.url,
    matchedSkills: job.matchedSkills,
    source: job.source,
  };
}

export function mapAppliedJob(job) {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    url: job.url,
    source: job.source,
  };
}

export function mapFailedJob(job, error) {
  return {
    id: job?.id ?? null,
    title: job?.title || job?.position || 'Unknown Title',
    company: job?.company?.name || job?.company_name || job?.company || 'Unknown Company',
    source: job?.source || 'unknown',
    error: summarizeError(error),
  };
}
