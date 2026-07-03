import { JobMatcher } from '../../../shared/services/matching/index.js';

export const DEFAULT_KEYWORDS = [
  '보안 운영',
  '보안 인프라',
  'SIEM',
  '보안 엔지니어',
  '정보보안',
  'FortiGate',
  'Splunk',
  'Security Operations',
  'Security Infrastructure',
];

export const DEFAULT_SOURCES = ['wanted', 'jobkorea', 'saramin'];
export const REVIEW_THRESHOLD = 60;

const AUTO_THRESHOLD = 75;
const BORDERLINE_THRESHOLD = 50;

function tierFor(percentage) {
  if (percentage >= AUTO_THRESHOLD) return 'auto';
  if (percentage >= REVIEW_THRESHOLD) return 'review';
  if (percentage >= BORDERLINE_THRESHOLD) return 'borderline';
  return 'skip';
}

export function parsePositiveInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isNaN(n) || n <= 0 ? fallback : n;
}

export function mergeAndRankResults(results) {
  const byId = new Map();
  for (const result of results) {
    if (!result || result.success === false || !Array.isArray(result.jobs)) continue;
    for (const job of result.jobs) {
      const key = job.id || `${job.company}_${job.position}`;
      const existing = byId.get(key);
      if (!existing || (job.matchPercentage || 0) > (existing.matchPercentage || 0)) {
        byId.set(key, job);
      }
    }
  }
  return [...byId.values()].sort((a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0));
}

export function rescoreJobs(jobs, options = {}) {
  const matcher = options.matcher || new JobMatcher({});
  const { jobs: scored } = matcher.filterAndRankJobs(jobs, {
    resumePath: options.resumePath,
    minScore: 0,
    maxResults: options.maxResults || jobs.length,
  });
  const prioritized = matcher.prioritizeApplications(scored);
  return [...prioritized].sort((a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0));
}

export function buildRankedReport(scoredJobs, options = {}) {
  const { minScore = REVIEW_THRESHOLD, maxResults = 50, keywords = [], enrichmentStats } = options;
  const sorted = [...scoredJobs].sort(
    (a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0)
  );
  const worthApplying = sorted
    .filter((job) => (job.matchPercentage || 0) >= minScore)
    .slice(0, maxResults)
    .map((job) => ({
      id: job.id,
      source: job.source,
      position: job.position,
      company: job.company,
      location: job.location || '',
      sourceUrl: job.sourceUrl || job.url || '',
      matchPercentage: job.matchPercentage || 0,
      matchScore: job.matchScore || 0,
      tier: tierFor(job.matchPercentage || 0),
      applicationPriority: job.applicationPriority || 'low',
      skillMatches: (job.matchDetails?.skillMatches || []).map((m) => m.keyword),
      bonusPoints: job.matchDetails?.bonusPoints || [],
      enrichmentStatus: job.enrichmentStatus || 'not_attempted',
      ...(job.enrichmentError ? { enrichmentError: job.enrichmentError } : {}),
    }));
  return {
    generatedAt: new Date().toISOString(),
    keywords,
    minScore,
    totalScored: scoredJobs.length,
    worthApplying,
    ...(enrichmentStats ? { enrichmentStats } : {}),
  };
}
