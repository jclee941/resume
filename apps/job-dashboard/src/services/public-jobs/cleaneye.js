/**
 * @fileoverview 클린아이 잡플러스 (job.cleaneye.go.kr), the recruitment board of local public
 * enterprises and foundations. The list endpoint answers JSON, 10 rows a page with no page-size
 * option; `status` 709001 is 진행중 and 709002 is 접수예정. Only 서울·인천·경기 rows are read, and a
 * detail page is fetched only for an IT or generic "직원 채용" title.
 * @module services/public-jobs/cleaneye
 */
import { itTerms, needsDetail, relevanceScore } from './filter.js';
import {
  deadlineIso,
  fetchText,
  htmlToText,
  mapSettled,
  partitionSettled,
  summarize,
  toIsoDate,
} from './text.js';

const LIST_URL = 'https://job.cleaneye.go.kr/user/selectYpRecruitment.do';
const DETAIL_URL = 'https://job.cleaneye.go.kr/user/ypCareersData.do';
export const CLEANEYE_STATUSES = Object.freeze(['709001', '709002']);
/** @type {Readonly<Record<string, string>>} */
export const CAPITAL_AREA_SIDO = Object.freeze({
  '007001': '서울',
  '007004': '인천',
  '007008': '경기',
});
const PAGE_SIZE = 10;
const MAX_PAGES = 40;

/**
 * @typedef {import('./text.js').Fetcher} Fetcher
 * @typedef {import('./repository.js').PublicPosting} PublicPosting
 * @typedef {import('./alio.js').Harvest} Harvest
 * @typedef {{ empyear: string; ypEntId: string; entSeq: string; sidoCd?: string; entName?: string; entTitle?: string; pubDate?: string; pubEndDate?: string }} CleaneyeItem
 */

/**
 * @param {string} text
 * @returns {{ list: CleaneyeItem[]; cnt: number }}
 */
function parseListPayload(text) {
  /** @type {{ list?: unknown; cnt?: unknown }} */
  const payload = JSON.parse(text);
  const list = Array.isArray(payload?.list) ? /** @type {CleaneyeItem[]} */ (payload.list) : [];
  return { list, cnt: Number(payload?.cnt) || list.length };
}

/**
 * @param {Fetcher} fetcher
 * @param {string} status
 * @returns {Promise<CleaneyeItem[]>}
 */
export async function listCleaneye(fetcher, status) {
  const readPage = async (/** @type {number} */ page) =>
    parseListPayload(await fetchText(fetcher, LIST_URL, { pageIndex: String(page), status }));
  const first = await readPage(1);
  const pages = Math.min(MAX_PAGES, Math.ceil(first.cnt / PAGE_SIZE));
  const rest = Array.from({ length: Math.max(0, pages - 1) }, (_, index) => index + 2);
  const settled = await mapSettled(rest, 3, readPage);
  for (const result of settled) if (result.status === 'rejected') throw result.reason;
  return [first, ...settled.map((r) => (r.status === 'fulfilled' ? r.value : { list: [] }))]
    .map((page) => page.list)
    .flat();
}

/**
 * @param {CleaneyeItem} item
 * @returns {string} the public GET address of the posting
 */
export function cleaneyeDetailUrl(item) {
  const query = new URLSearchParams({
    empyear: item.empyear,
    ypEntId: item.ypEntId,
    entSeq: item.entSeq,
  });
  return `${DETAIL_URL}?${query}`;
}

/**
 * @param {string} html
 * @returns {string} the "모집분야 및 인원" section text; the nav header also says 기관정보, so the
 *   section ends at "기관정보 기관명"
 */
export function parseCleaneyeBody(html) {
  const text = htmlToText(html);
  const start = text.indexOf('모집분야 및 인원');
  if (start < 0) return '';
  const end = text.indexOf('기관정보 기관명', start);
  return text.slice(start, end > start ? end : start + 4000).trim();
}

/**
 * @param {CleaneyeItem} item
 * @param {string} body
 * @returns {PublicPosting | null}
 */
export function toCleaneyePosting(item, body) {
  const terms = itTerms(`${item.entTitle ?? ''} ${body}`);
  if (terms.length === 0) return null;
  const location = CAPITAL_AREA_SIDO[item.sidoCd ?? ''] ?? null;
  return {
    id: `cleaneye-${item.empyear}-${item.ypEntId}-${item.entSeq}`,
    source: 'cleaneye',
    url: cleaneyeDetailUrl(item),
    title: item.entTitle ?? '',
    company: item.entName ?? '',
    location,
    description: summarize(
      {
        접수기간: `${item.pubDate ?? ''} ~ ${item.pubEndDate ?? ''}`,
        모집: body.replace('모집분야 및 인원', '').trim(),
      },
      600
    ),
    terms,
    career: null,
    score: relevanceScore({ terms, location, education: body }),
    deadline: deadlineIso(toIsoDate(item.pubEndDate)),
  };
}

/**
 * @param {Fetcher} fetcher
 * @param {{ budget: number }} options
 * @returns {Promise<Harvest>}
 */
export async function collectCleaneye(fetcher, { budget }) {
  const lists = await Promise.all(CLEANEYE_STATUSES.map((status) => listCleaneye(fetcher, status)));
  const items = lists.flat();
  const candidates = items
    .filter(
      (item) =>
        Object.hasOwn(CAPITAL_AREA_SIDO, item.sidoCd ?? '') && needsDetail(item.entTitle ?? '')
    )
    .slice(0, budget);
  const settled = await mapSettled(candidates, 4, async (item) =>
    toCleaneyePosting(item, parseCleaneyeBody(await fetchText(fetcher, cleaneyeDetailUrl(item))))
  );
  const { values, failed } = partitionSettled(settled);
  return { listed: items.length, candidates: candidates.length, failed, postings: values };
}
