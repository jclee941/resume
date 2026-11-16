/**
 * @fileoverview Adds a JobKorea posting's own text to its search record. Search records carry only
 * JobKorea's Korean tag lists, which rarely name the tools a posting asks for (Linux, Splunk,
 * FortiGate, automation), so scoring them alone undercounts skills. The posting text is served by
 * the description iframe (`/Recruit/GI_Read_Comt_Ifrm?Gno=<GI_No>`). Only the leading jobs are
 * enriched and the text is clipped, so the search step result stays within the Workflows limit.
 * @module workflows/application/jobkorea-detail
 */
import { DEFAULT_USER_AGENT } from '@resume/shared/ua';

export const JOBKOREA_DETAIL_LIMIT = 150;
export const JOBKOREA_DETAIL_CONCURRENCY = 4;
export const DETAIL_TEXT_CHARS = 600;
const DETAIL_URL = 'https://www.jobkorea.co.kr/Recruit/GI_Read_Comt_Ifrm';
const DETAIL_TIMEOUT_MS = 20_000;
/** Where the role itself starts; text before it is usually the company introduction. */
const ROLE_SECTION = /담당\s*업무|주요\s*업무|업무\s*내용|자격\s*요건|지원\s*자격|모집\s*분야/;

/** @type {Record<string, string>} */
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/**
 * @typedef {import('./platforms.js').PlatformJob} PlatformJob
 */

/**
 * The visible text of a description iframe from its role section on, clipped.
 * @param {string} html
 * @returns {string}
 */
export function detailText(html) {
  const text = html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#\d+|[a-z]+);/gi, (entity, name) =>
      name.startsWith('#')
        ? String.fromCodePoint(Number(name.slice(1)))
        : (ENTITIES[name] ?? entity)
    )
    .replace(/\s+/g, ' ')
    .trim();
  const start = text.search(ROLE_SECTION);
  return text.slice(Math.max(start, 0), Math.max(start, 0) + DETAIL_TEXT_CHARS);
}

/**
 * @param {typeof fetch} fetchImpl
 * @param {PlatformJob} job
 * @returns {Promise<PlatformJob>}
 */
async function enrichJob(fetchImpl, job) {
  const response = await fetchImpl(`${DETAIL_URL}?Gno=${job.sourceId}`, {
    headers: { 'User-Agent': DEFAULT_USER_AGENT, 'Accept-Language': 'ko-KR,ko;q=0.9' },
    signal: AbortSignal.timeout(DETAIL_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`JobKorea posting text error: ${response.status}`);
  const text = detailText(await response.text());
  return text ? { ...job, description: `${job.description ?? ''}\n${text}` } : job;
}

/**
 * Enriches the first JOBKOREA_DETAIL_LIMIT jobs, JOBKOREA_DETAIL_CONCURRENCY at a time. A job
 * whose text cannot be read keeps its search record; the failures are reported in one warning.
 * @param {PlatformJob[]} jobs
 * @param {typeof fetch} fetchImpl
 * @returns {Promise<PlatformJob[]>}
 */
export async function enrichJobKoreaJobs(jobs, fetchImpl) {
  const enriched = [...jobs];
  const count = Math.min(jobs.length, JOBKOREA_DETAIL_LIMIT);
  let next = 0;
  let failed = 0;
  const worker = async () => {
    while (next < count) {
      const index = next;
      next += 1;
      try {
        enriched[index] = await enrichJob(fetchImpl, jobs[index]);
      } catch {
        failed += 1;
      }
    }
  };
  await Promise.all(Array.from({ length: JOBKOREA_DETAIL_CONCURRENCY }, worker));
  if (failed > 0) {
    console.warn(`[jobkorea-search] posting text unavailable for ${failed} of ${count} jobs`);
  }
  return enriched;
}
