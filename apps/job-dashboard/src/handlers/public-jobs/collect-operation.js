import { jsonResponse } from '../../middleware/cors.js';
import { PUBLIC_JOB_SOURCES, collectPublicJobs } from '../../services/public-jobs/collect.js';

/**
 * @typedef {import('../../services/public-jobs/collect.js').PublicJobSource} PublicJobSource
 */

/**
 * @param {Request} request
 * @returns {Promise<{ sources: PublicJobSource[] } | { error: string }>}
 */
async function readSources(request) {
  const text = (await request.text()).trim();
  if (!text) return { sources: [...PUBLIC_JOB_SOURCES] };
  /** @type {{ sources?: unknown }} */
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return { error: 'Invalid JSON' };
  }
  const requested = body?.sources ?? [...PUBLIC_JOB_SOURCES];
  const known = /** @type {readonly string[]} */ (PUBLIC_JOB_SOURCES);
  const valid =
    Array.isArray(requested) &&
    requested.length > 0 &&
    requested.every((source) => known.includes(source));
  return valid
    ? { sources: [...new Set(/** @type {PublicJobSource[]} */ (requested))] }
    : { error: `sources must be a non-empty subset of ${PUBLIC_JOB_SOURCES.join(', ')}` };
}

/**
 * POST /api/public-jobs/collect: collects open public-sector IT/security postings from 잡알리오,
 * 클린아이 and 나라일터 into D1 `job_search_results`. Answers 502 only when every requested source
 * failed.
 * @param {Parameters<typeof collectPublicJobs>[0]} env
 * @param {Request} request
 * @param {typeof collectPublicJobs} [collect]
 * @returns {Promise<Response>}
 */
export async function handlePublicJobsCollect(env, request, collect = collectPublicJobs) {
  const parsed = await readSources(request);
  if ('error' in parsed) return jsonResponse({ error: parsed.error }, 400);
  const summary = await collect(env, { sources: parsed.sources });
  return jsonResponse(summary, summary.status === 'failed' ? 502 : 200);
}
