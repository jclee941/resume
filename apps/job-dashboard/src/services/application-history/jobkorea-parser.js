/**
 * @fileoverview Parses the JobKorea 입사지원 현황 page (`/User/ApplyMng`) from its rendered HTML.
 * The list is server-rendered: one `<tr>` per application holds `.apply-status` (label + date),
 * `.apply-board` (`.company`, `.description` linking `/Recruit/GI_Read/<posting no>`) and a
 * `.reading` cell (`is-reading-yes` once the employer opened it). A `colspan` row with
 * `.similar-list` follows some rows and lists recommended postings; it has no `.apply-board`
 * and is skipped. Rowspan groups reuse the previous status/date.
 * @module services/application-history/jobkorea-parser
 */

const ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};
const STATUS_RE = /<div class="[^"]*\bitem\b[^"]*\bstatus\b[^"]*">([^<]*)</;
const DATE_RE = /<div class="[^"]*\bitem\b[^"]*\bdate\b[^"]*">([^<]*)</;
const COMPANY_RE = /<div class="company">\s*<a\b[^>]*>([\s\S]*?)<\/a>/;
const POSTING_RE =
  /<div class="description">\s*<a\b[^>]*href="[^"]*\/Recruit\/GI_Read\/(\d+)[^"]*"[^>]*>([\s\S]*?)<\/a>/i;
const PAGINATION_RE = /<div class="tplPagination">([\s\S]*?)<\/div>/;

/**
 * @param {string} fragment
 * @returns {string}
 */
function textOf(fragment) {
  return fragment
    .replace(/<[^>]*>/g, '')
    .replace(
      /&(?:amp|lt|gt|quot|#39|nbsp);/g,
      (entity) => ENTITIES[/** @type {keyof typeof ENTITIES} */ (entity)]
    )
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {string} label
 * @param {boolean} read
 * @returns {string}
 */
export function mapJobKoreaStatus(label, read) {
  if (label.includes('불합격')) return 'rejected';
  if (label.includes('합격')) return 'offer';
  if (label.includes('면접')) return 'interview';
  if (label.includes('취소')) return 'withdrawn';
  return read ? 'viewed' : 'applied';
}

/**
 * @param {string} dotted `YYYY.MM.DD`
 * @returns {string | null}
 */
function toIsoDate(dotted) {
  const match = /^(\d{4})\.(\d{2})\.(\d{2})$/.exec(dotted);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

/**
 * @param {string} html
 * @returns {import('./history-types.js').HistoryRecord[]}
 */
export function parseJobKoreaApplyList(html) {
  /** @type {import('./history-types.js').HistoryRecord[]} */
  const records = [];
  let label = '';
  let date = '';
  for (const [, row] of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)) {
    if (!row.includes('apply-board')) continue;
    label = textOf(STATUS_RE.exec(row)?.[1] ?? label);
    date = textOf(DATE_RE.exec(row)?.[1] ?? date);
    const posting = POSTING_RE.exec(row);
    if (!posting) continue;
    records.push({
      source: 'jobkorea',
      jobId: `jobkorea-${posting[1]}`,
      company: textOf(COMPANY_RE.exec(row)?.[1] ?? '') || 'Unknown',
      position: textOf(posting[2]) || 'Unknown',
      url: `https://www.jobkorea.co.kr/Recruit/GI_Read/${posting[1]}`,
      appliedAt: toIsoDate(date),
      status: mapJobKoreaStatus(label, row.includes('is-reading-yes')),
    });
  }
  return records;
}

/**
 * @param {string} html
 * @returns {boolean} true for the applied-list page itself, false for an expired-session page
 */
export function isApplyListPage(html) {
  return /<title>[^<]*입사지원 현황/.test(html);
}

/**
 * @param {string} html
 * @returns {string[]} hrefs of the pager links (empty while everything fits one page)
 */
export function parseJobKoreaPagerLinks(html) {
  const pager = PAGINATION_RE.exec(html)?.[1] ?? '';
  const hrefs = [...pager.matchAll(/<a\b[^>]*href="([^"#][^"]*)"/g)].map(([, href]) =>
    href.replace(/&amp;/g, '&')
  );
  return [...new Set(hrefs.filter((href) => !href.startsWith('javascript:')))];
}
