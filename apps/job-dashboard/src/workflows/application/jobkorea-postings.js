/**
 * @fileoverview Parses JobKorea search result pages (`/Search/?tabType=recruit`) into PlatformJob
 * records. The page is a Next.js app whose posting list travels in the React flight payload
 * (`self.__next_f.push([1, "..."])` chunks) as one JSON object per posting:
 * `{"id":"<GI_No>","legacyJobNo":...,"title":...,"companyName":...,"receptionOptionType":...}`.
 * Codes were matched against the rendered cards and posting pages on 2026-11-16:
 * receptionOptionType starts with 1 when the posting offers 즉시지원 (000010 is 홈페이지 지원),
 * careerType 1/2/3/4 is 신입/경력/신입·경력/경력무관 with careerRange the minimum years (100 when
 * none is given), and educationCode 0/3/5 is 학력무관/고졸이상/대졸이상. The first character of an
 * areaCodeList code names the province the card shows (I0xx 서울, B0xx 경기, ...).
 * @module workflows/application/jobkorea-postings
 */

export const JOBKOREA_POSTING_URL = 'https://www.jobkorea.co.kr/Recruit/GI_Read';

const FLIGHT_CHUNK = /self\.__next_f\.push\(\[1,\s*("(?:[^"\\]|\\.)*")\]\)/g;
const POSTING_START = /\{"id":"(\d+)","legacyJobNo":/g;
const UNSPECIFIED_YEARS = 100;

/** @type {Record<string, string>} */
const AREA_PROVINCE = {
  I: '서울',
  B: '경기',
  K: '인천',
  A: '강원',
  G: '대전',
  H: '부산',
  P: '충북',
  1: '세종',
};

/** @type {Record<string, string>} */
const EDUCATION_TEXT = {
  0: '학력무관',
  3: '고졸 이상',
  4: '초대졸 이상',
  5: '대졸 이상',
  6: '석사 이상 (대졸 이상)',
  7: '박사 이상 (대졸 이상)',
};

/**
 * @typedef {{
 *   id: string;
 *   title?: string;
 *   companyName?: string;
 *   postingCompanyName?: string;
 *   receptionOptionType?: string;
 *   careerType?: string;
 *   careerRange?: number;
 *   educationCode?: string;
 *   areaCodeList?: string[];
 *   createdAt?: string;
 *   jobClassificationOrIndustry?: string;
 *   _internal_keywordList?: string[];
 *   _internal_featureSkillCode?: string;
 *   _internal_featureLocationCode?: string;
 * }} JobKoreaPosting
 */

/**
 * @param {string} html a JobKorea search result page
 * @returns {JobKoreaPosting[]} the postings on the page, first occurrence of each GI_No
 */
export function parseJobKoreaSearchPage(html) {
  const flight = [...html.matchAll(FLIGHT_CHUNK)].map(([, chunk]) => JSON.parse(chunk)).join('');
  /** @type {Map<string, JobKoreaPosting>} */
  const postings = new Map();
  for (const match of flight.matchAll(POSTING_START)) {
    if (postings.has(match[1])) continue;
    const body = objectAt(flight, match.index);
    if (body) postings.set(match[1], JSON.parse(body));
  }
  return [...postings.values()];
}

/**
 * The JSON object that opens at `start`, matched brace for brace outside string literals.
 * @param {string} text
 * @param {number} start
 * @returns {string | null} null when the payload ends before the object closes
 */
function objectAt(text, start) {
  let depth = 0;
  let inString = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (char === '\\') index += 1;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  return null;
}

/**
 * @param {JobKoreaPosting} posting
 * @returns {boolean} true when the posting takes a JobKorea 즉시지원 application
 */
export function offersImmediateApply(posting) {
  return String(posting.receptionOptionType ?? '').startsWith('1');
}

/**
 * @param {JobKoreaPosting} posting
 * @returns {string} required experience in the form the match scorer parses ('' when open-ended)
 */
function experienceOf(posting) {
  const years = Number(posting.careerRange);
  const hasYears = Number.isFinite(years) && years > 0 && years !== UNSPECIFIED_YEARS;
  switch (String(posting.careerType)) {
    case '1':
      return '0';
    case '2':
      return hasYears ? `${years}년 이상` : '';
    case '3':
    case '4':
      return '0년 이상';
    default:
      return '';
  }
}

/**
 * @param {JobKoreaPosting} posting
 * @returns {string} provinces of the posting's areas, then JobKorea's district names
 */
function locationOf(posting) {
  const provinces = (posting.areaCodeList ?? []).map((code) => AREA_PROVINCE[code.charAt(0)]);
  const districts = String(posting._internal_featureLocationCode ?? '').split(',');
  return [...new Set([...provinces, ...districts])].filter(Boolean).join(' ');
}

/**
 * @param {JobKoreaPosting} posting
 * @returns {import('./platforms.js').PlatformJob}
 */
export function toJobKoreaJob(posting) {
  const url = `${JOBKOREA_POSTING_URL}/${posting.id}`;
  const experience = experienceOf(posting);
  const education = EDUCATION_TEXT[String(posting.educationCode)];
  const description = [
    String(posting.jobClassificationOrIndustry ?? '')
      .split(',')
      .filter(Boolean)
      .join(', '),
    (posting._internal_keywordList ?? []).join(', '),
    posting._internal_featureSkillCode ?? '',
    experience ? `경력: ${experience}` : '',
    education ? `학력: ${education}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  return {
    id: `jobkorea-${posting.id}`,
    sourceId: posting.id,
    company: posting.companyName || posting.postingCompanyName || '',
    position: posting.title ?? '',
    url,
    sourceUrl: url,
    location: locationOf(posting),
    experience,
    description,
    postedAt: posting.createdAt,
  };
}
