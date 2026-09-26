import { appendDecisionTrace } from './decision-trace.js';
import { normalizeApplicationPlatform } from '../../workflows/application/application-platform-catalog.js';

const DEFAULT_MAX_DEPTH = 1;
const MAX_ALLOWED_DEPTH = 5;

/**
 * @typedef {{
 *   recursive?: { next?: RecursiveReference[] };
 *   id?: string | number;
 *   sourceId?: string | number;
 *   source?: string;
 *   platform?: string;
 *   loginPlatform?: string;
 *   position?: string;
 *   title?: string;
 *   company?: string;
 *   sourceUrl?: string;
 *   url?: string;
 *   decisionTrace?: unknown[];
 *   [key: string]: unknown;
 * }} RecursiveReference
 *
 * @typedef {RecursiveReference} ExplicitJob
 *
 * @typedef {ExplicitJob & {
 *   id: string;
 *   sourceId: string;
 *   source: string;
 *   sourceUrl: string;
 *   decisionTrace: unknown[];
 * }} NormalizedExplicitJob
 *
 * @typedef {{ maxDepth: number; maxVisitedDepth: number; visited: number; truncated: number }} ExplicitRecursion
 *
 * @typedef {{ hasExplicitCandidates: false; jobs?: undefined; recursion?: undefined }
 *   | { hasExplicitCandidates: true; jobs: NormalizedExplicitJob[]; recursion: ExplicitRecursion }} ValidExplicitCandidates
 *
 * @typedef {ValidExplicitCandidates
 *   | { hasExplicitCandidates: true; error: string; status: number }} ExplicitCandidatesResult
 */

/**
 * @param {unknown} [value]
 * @returns {{ value: number; error?: never } | { error: string; value?: never }}
 */
function parseMaxDepth(value) {
  const depth = /** @type {number} */ (value ?? DEFAULT_MAX_DEPTH);
  if (!Number.isInteger(depth) || depth < 0 || depth > MAX_ALLOWED_DEPTH) {
    return { error: 'maxDepth must be an integer between 0 and 5' };
  }
  return { value: depth };
}

/**
 * @param {ExplicitJob | null | undefined} job
 * @returns {unknown}
 */
function hasRequiredJobFields(job) {
  const source = getCandidateSource(job);
  return (
    job &&
    typeof job === 'object' &&
    (job.id || job.sourceId) &&
    source &&
    (job.position || job.title) &&
    job.company
  );
}

/**
 * @param {ExplicitJob} candidate
 * @param {number} index
 * @returns {{ job: NormalizedExplicitJob; error?: never } | { error: string; job?: never }}
 */
function normalizeCandidate(candidate, index) {
  if (!hasRequiredJobFields(candidate)) {
    return {
      error: `candidates[${index}] must include id, source/platform, position, and company`,
    };
  }

  const sourceId = String(candidate.sourceId || candidate.id);
  const source = getCandidateSource(candidate);
  return {
    job: appendDecisionTrace(
      {
        ...candidate,
        id: sourceId,
        sourceId,
        source,
        sourceUrl: candidate.sourceUrl || candidate.url || '',
      },
      {
        stage: 'direct_candidate_received',
        outcome: 'included',
        reason: 'request_candidates',
      }
    ),
  };
}

/**
 * @param {ExplicitJob | null | undefined} candidate
 * @returns {string}
 */
function getCandidateSource(candidate) {
  return normalizeApplicationPlatform(
    candidate?.source || candidate?.platform || candidate?.loginPlatform
  );
}

/**
 * @param {ExplicitJob | null | undefined} job
 * @param {number} maxDepth
 * @returns {{ visited: number; truncated: number; maxVisitedDepth: number }}
 */
function collectRecursiveReferences(job, maxDepth) {
  const next = Array.isArray(job?.recursive?.next) ? job.recursive.next : [];
  if (maxDepth === 0) {
    return { visited: 0, truncated: next.length, maxVisitedDepth: 0 };
  }

  let visited = 0;
  let truncated = 0;
  let maxVisitedDepth = 0;
  const stack = next.map((reference) => ({ reference, depth: 1 }));

  while (stack.length > 0) {
    const current = /** @type {{ reference: RecursiveReference; depth: number }} */ (stack.shift());
    if (current.depth > maxDepth) {
      truncated++;
      continue;
    }

    visited++;
    maxVisitedDepth = Math.max(maxVisitedDepth, current.depth);
    const children = Array.isArray(current.reference?.recursive?.next)
      ? current.reference.recursive.next
      : [];
    for (const child of children) {
      stack.push({ reference: child, depth: current.depth + 1 });
    }
  }

  return { visited, truncated, maxVisitedDepth };
}

/**
 * @param {Record<string, unknown> | null | undefined} body
 * @returns {ExplicitCandidatesResult}
 */
export function readExplicitCandidates(body) {
  if (!body || typeof body !== 'object') {
    return { hasExplicitCandidates: false };
  }

  const candidates = Object.hasOwn(body, 'candidates') ? body.candidates : body.explicitCandidates;
  if (!Object.hasOwn(body, 'candidates') && !Object.hasOwn(body, 'explicitCandidates')) {
    return { hasExplicitCandidates: false };
  }

  if (!Array.isArray(candidates)) {
    return {
      hasExplicitCandidates: true,
      error: 'candidates must be an array',
      status: 400,
    };
  }

  const parsedDepth = parseMaxDepth(body.maxDepth);
  if (parsedDepth.error) {
    return { hasExplicitCandidates: true, error: parsedDepth.error, status: 400 };
  }

  const jobs = [];
  let visited = 0;
  let truncated = 0;
  let maxVisitedDepth = 0;
  for (let index = 0; index < candidates.length; index++) {
    const normalized = normalizeCandidate(candidates[index], index);
    if (normalized.error) {
      return { hasExplicitCandidates: true, error: normalized.error, status: 400 };
    }
    const recursive = collectRecursiveReferences(
      /** @type {ExplicitJob} */ (normalized.job),
      /** @type {number} */ (parsedDepth.value)
    );
    visited += 1 + recursive.visited;
    truncated += recursive.truncated;
    maxVisitedDepth = Math.max(maxVisitedDepth, recursive.maxVisitedDepth);
    jobs.push(
      appendDecisionTrace(/** @type {NormalizedExplicitJob} */ (normalized.job), {
        stage: 'recursive_expanded',
        outcome: 'included',
        reason: 'bounded_request_recursion',
        maxDepth: /** @type {number} */ (parsedDepth.value),
        maxVisitedDepth: recursive.maxVisitedDepth,
        visited: 1 + recursive.visited,
        truncated: recursive.truncated,
      })
    );
  }

  return {
    hasExplicitCandidates: true,
    jobs,
    recursion: {
      maxDepth: /** @type {number} */ (parsedDepth.value),
      maxVisitedDepth,
      visited,
      truncated,
    },
  };
}
