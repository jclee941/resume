/**
 * @fileoverview 잡알리오 (job.alio.go.kr), the national public-institution recruitment portal. The
 * list is a server-rendered table (50 rows a page, `ing=2` = open, the first row's 번호 is the total);
 * `detail_code=R600020` narrows it to postings tagged NCS 정보통신. A detail page is th/td pairs
 * (표준직무(NCS), 학력정보, 채용구분, 고용형태, 근무지, 채용기간) plus per-position tables.
 * @module services/public-jobs/alio
 */
import { isNonItTitle, itTerms, relevanceScore } from './filter.js';
import {
  daysBefore,
  deadlineIso,
  fetchText,
  htmlToText,
  mapSettled,
  partitionSettled,
  summarize,
  toIsoDate,
} from './text.js';

const LIST_URL = 'https://job.alio.go.kr/recruit.do';
const DETAIL_URL = 'https://job.alio.go.kr/recruitview.do?idx=';
export const ALIO_IT_NCS = 'R600020';
const PAGE_SIZE = 50;
const MAX_PAGES = 15;
const LOOKBACK_DAYS = 365;
const NCS_FIELD = '표준직무(NCS)';
const NOT_DESCRIBING = /표준직무|우대조건|급여|등록일|입사지원서|직무기술서|첨부/;

/**
 * @typedef {import('./text.js').Fetcher} Fetcher
 * @typedef {import('./repository.js').PublicPosting} PublicPosting
 * @typedef {{ idx: string; no: number; title: string; org: string; location: string; employment: string; due: string | null }} AlioRow
 * @typedef {{ listed: number; candidates: number; failed: number; postings: PublicPosting[] }} Harvest
 */

/**
 * @param {string} html
 * @returns {AlioRow[]}
 */
export function parseAlioList(html) {
  const table = html.indexOf('tbl type_03');
  if (table < 0) return [];
  const start = html.indexOf('<tbody', table);
  const body = html.slice(start, html.indexOf('</tbody>', start));
  /** @type {AlioRow[]} */
  const rows = [];
  for (const tr of body.split(/<tr[\s>]/i).slice(1)) {
    const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => htmlToText(m[1]));
    const idx = /recruitview\.do\?idx=(\d+)/.exec(tr)?.[1];
    if (!idx || cells.length < 8) continue;
    rows.push({
      idx,
      no: Number(cells[1]) || 0,
      title: cells[2],
      org: cells[3],
      location: cells[4],
      employment: cells[5],
      due: toIsoDate(cells[7]),
    });
  }
  return rows;
}

/**
 * @param {string} html
 * @returns {Record<string, string>} th text -> td text, first occurrence wins
 */
export function parseAlioDetail(html) {
  /** @type {Record<string, string>} */
  const fields = {};
  for (const match of html.matchAll(/<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi)) {
    const key = htmlToText(match[1]);
    if (key && !(key in fields)) fields[key] = htmlToText(match[2]);
  }
  return fields;
}

/**
 * @param {Fetcher} fetcher
 * @param {string} today YYYY-MM-DD in Korean time
 * @param {string} [ncs] NCS category code, e.g. ALIO_IT_NCS
 * @returns {Promise<AlioRow[]>} every open posting registered in the last LOOKBACK_DAYS
 */
export async function listAlio(fetcher, today, ncs) {
  const form = {
    ing: '2',
    pageSet: String(PAGE_SIZE),
    s_date: daysBefore(today, LOOKBACK_DAYS).replaceAll('-', '.'),
    e_date: today.replaceAll('-', '.'),
    ...(ncs ? { detail_code: ncs } : {}),
  };
  const readPage = async (/** @type {number} */ page) =>
    parseAlioList(await fetchText(fetcher, LIST_URL, { ...form, pageNo: String(page) }));
  const first = await readPage(1);
  const pages = Math.min(MAX_PAGES, Math.ceil((first[0]?.no ?? 0) / PAGE_SIZE));
  const rest = Array.from({ length: Math.max(0, pages - 1) }, (_, index) => index + 2);
  const settled = await mapSettled(rest, 3, readPage);
  for (const result of settled) if (result.status === 'rejected') throw result.reason;
  return [first, ...settled.map((r) => (r.status === 'fulfilled' ? r.value : []))].flat();
}

/**
 * @param {AlioRow} row
 * @param {Record<string, string>} fields parsed detail page
 * @returns {PublicPosting | null} null when nothing in the posting reads as an IT/security job;
 *   a posting found only through its NCS tag (often one of many categories) is scored as weak
 */
export function toAlioPosting(row, fields) {
  const described = Object.entries(fields).filter(([key]) => !NOT_DESCRIBING.test(key));
  const strong = itTerms([row.title, ...described.flat()].join(' '));
  const weak = strong.length === 0;
  const terms = weak ? itTerms(fields[NCS_FIELD]) : strong;
  if (terms.length === 0) return null;
  const location = fields['근무지'] || row.location;
  const career = fields['채용구분'] || null;
  const period = fields['채용기간'] || '';
  return {
    id: `alio-${row.idx}`,
    source: 'alio',
    url: `${DETAIL_URL}${row.idx}`,
    title: row.title,
    company: row.org,
    location,
    description: summarize({
      NCS: fields[NCS_FIELD],
      학력: fields['학력정보'],
      근무분야: fields['근무분야'],
      채용구분: career,
      고용형태: fields['고용형태'] || row.employment,
      채용기간: period,
    }),
    terms,
    career,
    score: relevanceScore({ terms, weak, location, education: fields['학력정보'], career }),
    deadline: deadlineIso(toIsoDate(period.split('~')[1]) ?? row.due),
  };
}

/**
 * Lists every open posting plus the NCS 정보통신 list, then reads the detail page of each
 * candidate: an IT title, or an NCS-tagged posting whose title does not name a non-IT job.
 * @param {Fetcher} fetcher
 * @param {{ today: string; budget: number }} options
 * @returns {Promise<Harvest>}
 */
export async function collectAlio(fetcher, { today, budget }) {
  const [all, tagged] = await Promise.all([
    listAlio(fetcher, today),
    listAlio(fetcher, today, ALIO_IT_NCS),
  ]);
  const taggedIds = new Set(tagged.map((row) => row.idx));
  const candidates = all
    .filter(
      (row) => itTerms(row.title).length > 0 || (taggedIds.has(row.idx) && !isNonItTitle(row.title))
    )
    .slice(0, budget);
  const settled = await mapSettled(candidates, 4, async (row) =>
    toAlioPosting(row, parseAlioDetail(await fetchText(fetcher, `${DETAIL_URL}${row.idx}`)))
  );
  const { values, failed } = partitionSettled(settled);
  return { listed: all.length, candidates: candidates.length, failed, postings: values };
}
