/**
 * @fileoverview Decides which public-sector postings are IT/security jobs and ranks them for the
 * owner's profile. Only posting text is read; eligibility rules that live in attached notices
 * (required certificates, degrees) are not visible here, so the score is relevance, not a verdict.
 * @module services/public-jobs/filter
 */

const IT_TERMS =
  /전산|정보보안|정보보호(?!\s*등에\s*관한)|보안관제|사이버\s*(?:보안|안전|위협|침해)|정보통신(?!망)|정보화|정보시스템|정보기술|네트워크|클라우드|데이터센터|정보처리|ICT|(?<![A-Za-z])IT(?![A-Za-z])|시스템\s?(?:운영|관리|엔지니어)|서버\s?(?:운영|관리)|보안\s?(?:엔지니어|담당|운영|솔루션)|개인정보\s*보호\s*(?:업무|담당)/g;
const NON_IT_TITLE =
  /간호|의사|전문의|약사|약무|방사선사|임상병리|조리|미화|운전원|운전직|정수장|상수관망|상수도|수도지사|수도센터|도수로|배출수|시설운영|현대화사업|건설사업|기술관리|전력통신설비|단순정비|작업원|수영|체육|강사|청소년지도|요양|돌봄|보육|경비|주차|방호|AMI|배전|일용|단기노무|체험형|박사후|연구직|교수|변호사|센터장|위촉|임원|이사장|대표이사|비상임/;
const GENERIC_TITLE = /(?:직원|신입|경력|정규직|공무직|일반직|통합)[\s\S]*?(?:채용|모집)/;
const CAPITAL_AREA = /서울|경기|인천/;
const OPEN_EDUCATION = /학력\s*무관|학력[^.|]{0,20}제한\s*없|고졸/;

/**
 * @param {string | null | undefined} text
 * @returns {string[]} distinct IT/security terms found, whitespace removed
 */
export function itTerms(text) {
  const found = String(text ?? '').matchAll(IT_TERMS);
  return [...new Set([...found].map((match) => match[0].replace(/\s+/g, '')))];
}

/**
 * @param {string} title
 * @returns {boolean} true when the title names a non-IT job and no IT term
 */
export function isNonItTitle(title) {
  return NON_IT_TITLE.test(title) && itTerms(title).length === 0;
}

/**
 * @param {string} title
 * @returns {boolean} true when the detail page is worth fetching: an IT title, or a generic
 *   "직원 채용" title that may hide an IT position
 */
export function needsDetail(title) {
  if (itTerms(title).length > 0) return true;
  return GENERIC_TITLE.test(title) && !NON_IT_TITLE.test(title);
}

/**
 * @param {{ terms: string[]; weak?: boolean; location?: string | null; education?: string | null; career?: string | null }} posting
 *   `weak` marks terms that come only from a coarse category tag such as an NCS list
 * @returns {number} 0 without IT terms, else 50 (30 when weak) plus 20 for open education, 20 for
 *   서울·경기·인천 and 10 for a 경력 track, capped at 100
 */
export function relevanceScore({ terms, weak = false, location, education, career }) {
  if (terms.length === 0) return 0;
  let score = weak ? 30 : 50;
  if (OPEN_EDUCATION.test(education ?? '')) score += 20;
  if (CAPITAL_AREA.test(location ?? '')) score += 20;
  if (/경력/.test(career ?? '')) score += 10;
  return Math.min(100, score);
}
