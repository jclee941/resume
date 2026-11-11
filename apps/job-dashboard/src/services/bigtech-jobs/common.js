import { relevanceScore } from '../public-jobs/filter.js';
import { extractSalary } from '../public-jobs/salary.js';
import { htmlToText, mapSettled, partitionSettled } from '../public-jobs/text.js';
import { object, optionalText } from './payload.js';

/**
 * @typedef {'amazon' | 'line' | 'naver' | 'daangn' | 'kakao'} Source
 * @typedef {{ today: string; budget: number }} Options
 * @typedef {{
 * id: string; title: string; url: string; location: string | null;
 * company?: string; description?: string; deadline: string | null;
 * open?: boolean; career?: string | null; baseSalary?: unknown
 * }} Candidate
 * @typedef {{
 * listed: number; candidates: number; failed: number;
 * postings: import('../public-jobs/repository.js').PublicPosting[]
 * }} Harvest
 */

const EXCLUDED =
  /\b(?:intern(?:ship)?|manager|director|lead|leader|head|chief|sales|recruiter|SRE|DevOps|DevSecOps|privacy)\b|site\s+reliability|cloud[\s-]*security|클라우드\s*보안|개인정보|security\s*(?:policy|compliance)|보안\s*(?:정책|컴플라이언스)|인턴|팀장|실장|본부장|리더|리드|매니저|영업|사업개발|시설|총무|물리\s*보안|경비|출입통제|데이터센터\s*보안|data\s*center\s*(?:engineering\s*operations|security)|datacenter\s*security|\bDCEO\b|physical\s*security/i;
const PRACTITIONER =
  /정보\s*(?:보안|보호)|보안|네트워크|인프라|전산|(?:시스템|서버|클라우드)\s*(?:운영|관리|엔지니어)|\b(?:security|network|infrastructure|infra|SysOps)\b|\bIT\s+(?:operations?|support)\b|(?:linux\s+)?system(?:s)?\s+(?:engineer|administrator)|data\s*center\s+operations?\s+(?:engineer|technician)/i;
const KOREA =
  /\b(?:KR|KOR|Korea|Seoul|Bundang|Pangyo|Gwacheon|Yongin|Ulsan|Incheon|Busan|Daejeon|Seongnam|Pyeongtaek)\b|한국|대한민국|서울|경기|성남|분당|판교|과천|용인|울산|인천|부산|대전|평택/i;

/** @param {string} title @returns {boolean} */
export function isPractitioner(title) {
  const development =
    /\bsoftware\s+(?:development\s+)?engineer\b|\b(?:backend|frontend|developer)\b|백엔드|프론트엔드|소프트웨어\s*개발/i;
  return PRACTITIONER.test(title) && !EXCLUDED.test(title) && !development.test(title);
}

/** @param {string | null | undefined} location @returns {boolean} */
export function isKorea(location) {
  return typeof location === 'string' && KOREA.test(location);
}

/** @param {string | null | undefined} value @returns {string | null} */
export function deadline(value) {
  if (!value) return null;
  const text = String(value).trim();
  const local = /^(\d{4})[.-](\d{2})[.-](\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(text);
  const input = local
    ? `${local[1]}-${local[2]}-${local[3]}T${local[4]}:${local[5]}:${local[6] || '00'}+09:00`
    : /^\d{4}-\d{2}-\d{2}$/.test(text)
      ? `${text}T23:59:59+09:00`
      : text;
  const date = new Date(input);
  if (!Number.isFinite(date.getTime())) throw new Error(`Invalid closing date: ${text}`);
  return date.toISOString().replace('.000Z', 'Z');
}

/** @param {string | null} date @param {string} today @returns {boolean} */
export function onOrAfter(date, today) {
  if (!date) return true;
  return new Date(Date.parse(date) + 9 * 3_600_000).toISOString().slice(0, 10) >= today;
}

/** @param {string | null | undefined} html @returns {string} */
export function jobText(html) {
  return String(html ?? '')
    .replace(/<br\s*\/?>|<\/(?:p|li|h[1-6]|div)>/gi, '\n')
    .split('\n')
    .map(htmlToText)
    .filter(Boolean)
    .join('\n');
}

/** @param {unknown} baseSalary @returns {string | null} */
function structuredSalary(baseSalary) {
  if (baseSalary == null) return null;
  const base = object(baseSalary);
  const value = object(base.value);
  const amount =
    value.value ??
    (value.minValue != null && value.maxValue != null
      ? `${value.minValue} - ${value.maxValue}`
      : null);
  const currency = optionalText(base.currency);
  const unit = optionalText(value.unitText);
  if (amount === null || amount === '' || !currency) return null;
  if (typeof amount !== 'number' && typeof amount !== 'string') {
    throw new Error('Invalid structured salary value');
  }
  return `${currency} ${amount}${unit ? ` / ${unit}` : ''}`;
}

/**
 * @param {Source} source @param {Candidate} row @param {string} today
 * @returns {import('../public-jobs/repository.js').PublicPosting | null}
 */
export function toPosting(source, row, today) {
  if (!isPractitioner(row.title) || !isKorea(row.location) || row.open === false) return null;
  const expires = deadline(row.deadline);
  if (!onOrAfter(expires, today)) return null;
  const text = jobText(row.description);
  if (/\bphysical\s+security\b|CCTV.{0,50}(?:guard|경비)|물리\s*보안|경비원/i.test(text))
    return null;
  if (!row.id || !row.company || !text) throw new Error(`${source}: incomplete posting`);
  const terms = [...new Set(row.title.match(new RegExp(PRACTITIONER.source, 'gi')) || [])];
  const career =
    row.career ||
    text.match(/경력\s*\d+\s*년(?:\s*이상)?|\d+\+?\s*years?(?:\s+of)?\s+experience/i)?.[0] ||
    null;
  const bodySalary = extractSalary(text);
  const salary = bodySalary || structuredSalary(row.baseSalary);
  const description = htmlToText(text) + (!bodySalary && salary ? ` | ${salary}` : '');
  return {
    id: `${source}-${row.id}`,
    source,
    url: row.url,
    title: row.title,
    company: row.company,
    location: row.location,
    description,
    terms,
    career,
    score: relevanceScore({ terms, location: row.location, career }),
    deadline: expires,
    salary,
  };
}

/**
 * @param {Source} source @param {Candidate[]} all @param {Options} options
 * @param {(row: Candidate) => Promise<Candidate>} [read] @returns {Promise<Harvest>}
 */
export async function harvest(source, all, { today, budget }, read = async (row) => row) {
  const candidates = all
    .filter(
      (row) =>
        row.open !== false &&
        isPractitioner(row.title) &&
        (row.location === null || isKorea(row.location)) &&
        onOrAfter(row.deadline, today)
    )
    .slice(0, budget);
  const settled = await mapSettled(candidates, 4, async (row) =>
    toPosting(source, await read(row), today)
  );
  const { values, failed } = partitionSettled(settled);
  return { listed: all.length, candidates: candidates.length, failed, postings: values };
}
