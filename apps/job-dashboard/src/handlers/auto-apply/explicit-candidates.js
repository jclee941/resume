import { appendDecisionTrace } from './decision-trace.js';
import { normalizeApplicationPlatform } from '../../workflows/application/application-platform-catalog.js';

const DEFAULT_MAX_DEPTH = 1;
const MAX_ALLOWED_DEPTH = 5;

function parseMaxDepth(value) {
  const depth = value ?? DEFAULT_MAX_DEPTH;
  if (!Number.isInteger(depth) || depth < 0 || depth > MAX_ALLOWED_DEPTH) {
    return { error: 'maxDepth must be an integer between 0 and 5' };
  }
  return { value: depth };
}

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

function getCandidateSource(candidate) {
  return normalizeApplicationPlatform(
    candidate?.source || candidate?.platform || candidate?.loginPlatform
  );
}

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
    const current = stack.shift();
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
    const recursive = collectRecursiveReferences(normalized.job, parsedDepth.value);
    visited += 1 + recursive.visited;
    truncated += recursive.truncated;
    maxVisitedDepth = Math.max(maxVisitedDepth, recursive.maxVisitedDepth);
    jobs.push(
      appendDecisionTrace(normalized.job, {
        stage: 'recursive_expanded',
        outcome: 'included',
        reason: 'bounded_request_recursion',
        maxDepth: parsedDepth.value,
        maxVisitedDepth: recursive.maxVisitedDepth,
        visited: 1 + recursive.visited,
        truncated: recursive.truncated,
      })
    );
  }

  return {
    hasExplicitCandidates: true,
    jobs,
    recursion: { maxDepth: parsedDepth.value, maxVisitedDepth, visited, truncated },
  };
}
