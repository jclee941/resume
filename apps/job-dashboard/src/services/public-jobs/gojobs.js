/**
 * @fileoverview 나라일터 (gojobs.go.kr), the government recruitment board (ministries, local
 * governments, public bodies). Keyword search matches titles and also returns closed postings,
 * newest first, so rows past 접수마감일 and result notices (합격자·면접 일정 공고) are dropped. Titles
 * such as "과학기술정보통신부 …" match 정보통신 through the organization name, so the name is removed
 * before matching, and detail text is cut at the `목록 -->` marker ahead of the ministry footer.
 * @module services/public-jobs/gojobs
 */
import { itTerms, relevanceScore } from './filter.js';
import {
  deadlineIso,
  fetchText,
  htmlToText,
  mapSettled,
  partitionSettled,
  summarize,
  toIsoDate,
} from './text.js';

const SEARCH_URL = 'https://www.gojobs.go.kr/apmList.do';
const DETAIL_URL = 'https://www.gojobs.go.kr/apmView.do?empmnsn=';
export const GOJOBS_KEYWORDS = Object.freeze([
  '전산',
  '정보보안',
  '정보보호',
  '정보통신',
  '정보화',
  '네트워크',
  '사이버',
  '정보시스템',
  '정보기술',
  '보안관제',
  '클라우드',
]);
const RESULT_NOTICE = /합격자|면접\s*시험|시험\s*일정|결과\s*공고|일정\s*공고/;
const MAX_PAGES = 3;

/**
 * @typedef {import('./text.js').Fetcher} Fetcher
 * @typedef {import('./repository.js').PublicPosting} PublicPosting
 * @typedef {import('./alio.js').Harvest} Harvest
 * @typedef {{ sn: string; title: string; org: string; posted: string | null; due: string | null }} GojobsRow
 */

/**
 * @param {string} html
 * @returns {GojobsRow[]}
 */
export function parseGojobsList(html) {
  const start = html.indexOf('<tbody');
  if (start < 0) return [];
  const body = html.slice(start, html.indexOf('</tbody>', start));
  /** @type {GojobsRow[]} */
  const rows = [];
  for (const tr of body.split(/<tr[\s>]/i).slice(1)) {
    const sn = /fn_apmView\('\d+',\s*'(\d+)'\)/.exec(tr)?.[1];
    const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => htmlToText(m[1]));
    if (!sn || cells.length < 5) continue;
    rows.push({
      sn,
      title: cells[1],
      org: cells[2],
      posted: toIsoDate(cells[3]),
      due: toIsoDate(cells[4]),
    });
  }
  return rows;
}

/**
 * @param {Fetcher} fetcher
 * @param {string} keyword
 * @param {string} today YYYY-MM-DD in Korean time
 * @returns {Promise<GojobsRow[]>} rows whose 접수마감일 is today or later
 */
export async function searchGojobs(fetcher, keyword, today) {
  /** @type {GojobsRow[]} */
  const open = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const query = new URLSearchParams({
      menuNo: '401',
      mngrMenuYn: 'N',
      selMenuNo: '400',
      upperMenuNo: '',
      searchKeyword: keyword,
      pageIndex: String(page),
    });
    const rows = parseGojobsList(await fetchText(fetcher, `${SEARCH_URL}?${query}`));
    const current = rows.filter((row) => row.due !== null && row.due >= today);
    open.push(...current);
    if (rows.length === 0 || current.length < rows.length) break;
  }
  return open;
}

/**
 * @param {string} html
 * @returns {{ text: string; grade: string; area: string }}
 */
export function parseGojobsDetail(html) {
  const cut = html.indexOf('목록 -->');
  const text = htmlToText(cut > 0 ? html.slice(0, cut) : html);
  const grade = /채용직급\s+(.+?)\s+근무지역/.exec(text)?.[1] ?? '';
  const area = /근무지역\s+(.+?)\s+장애인/.exec(text)?.[1] ?? '';
  return { text, grade, area };
}

/**
 * @param {GojobsRow} row
 * @returns {string[]} IT terms in the title once the organization name is removed
 */
function titleTerms(row) {
  return itTerms(row.org ? row.title.replaceAll(row.org, ' ') : row.title);
}

/**
 * @param {GojobsRow} row
 * @param {{ text: string; grade: string; area: string }} detail
 * @returns {PublicPosting | null}
 */
export function toGojobsPosting(row, detail) {
  const terms = [...new Set([...titleTerms(row), ...itTerms(detail.grade)])];
  if (terms.length === 0) return null;
  const at = detail.text.indexOf(row.title.slice(0, 12));
  return {
    id: `gojobs-${row.sn}`,
    source: 'gojobs',
    url: `${DETAIL_URL}${row.sn}`,
    title: row.title,
    company: row.org,
    location: detail.area || null,
    description: summarize(
      {
        채용직급: detail.grade,
        근무지역: detail.area,
        접수: `${row.posted ?? ''} ~ ${row.due ?? ''}`,
        공고: at >= 0 ? detail.text.slice(at, at + 600) : '',
      },
      600
    ),
    terms,
    career: null,
    score: relevanceScore({ terms, location: detail.area, education: detail.text }),
    deadline: deadlineIso(row.due),
  };
}

/**
 * @param {Fetcher} fetcher
 * @param {{ today: string; budget: number }} options
 * @returns {Promise<Harvest>}
 */
export async function collectGojobs(fetcher, { today, budget }) {
  const searches = await mapSettled([...GOJOBS_KEYWORDS], 3, (keyword) =>
    searchGojobs(fetcher, keyword, today)
  );
  for (const result of searches) if (result.status === 'rejected') throw result.reason;
  /** @type {Map<string, GojobsRow>} */
  const found = new Map();
  for (const result of searches) {
    if (result.status !== 'fulfilled') continue;
    for (const row of result.value) if (!RESULT_NOTICE.test(row.title)) found.set(row.sn, row);
  }
  const candidates = [...found.values()]
    .filter((row) => titleTerms(row).length > 0)
    .slice(0, budget);
  const settled = await mapSettled(candidates, 4, async (row) =>
    toGojobsPosting(row, parseGojobsDetail(await fetchText(fetcher, `${DETAIL_URL}${row.sn}`)))
  );
  const { values, failed } = partitionSettled(settled);
  return { listed: found.size, candidates: candidates.length, failed, postings: values };
}
