import { parsePeriod } from '../date-formatters.js';

export const SK_CAREER_LIMIT = 5;
export const SK_CERT_LIMIT = 5;

/** @type {Array<[RegExp, string]>} */
const MILITARY_TYPES = [
  [/사회복무|공익/, '303003'],
  [/산업기능/, '303005'],
  [/전문연구/, '303004'],
  [/상근/, '303002'],
];

/**
 * @typedef {import('./form-codec.js').FormObject} FormObject
 * @typedef {{
 *   careers?: Array<{ company?: string; period?: string; role?: string; description?: string }>;
 *   certifications?: Array<{ name?: string; issuer?: string; date?: string | null; status?: string }>;
 *   education?: {
 *     school?: string; major?: string; startDate?: string; endDate?: string; status?: string;
 *     schoolType?: string; highSchool?: string; highSchoolGraduation?: string;
 *   };
 *   military?: { status?: string; period?: string };
 * }} SkCareersSsot
 */

/**
 * The SK Careers resume sections the SSoT fills, keyed like the site's form fields: the
 * five most recent careers, the five most recent active certificates, the university and
 * the high school, and military service. A section with several items holds one array per
 * field (the page posts repeated items positionally); a single item holds plain strings.
 * New items carry Seq "0", which the site treats as a row to create.
 * @param {SkCareersSsot} ssot
 * @param {{ newId?: () => string }} [options] id for the education items' random keys
 * @returns {{ personal: FormObject; education: FormObject; careers: FormObject; certificates: FormObject }}
 */
export function mapToSkCareersResume(ssot, { newId = () => crypto.randomUUID() } = {}) {
  return {
    personal: militaryFields(ssot.military),
    education: {
      ...highSchoolFields(ssot.education, newId),
      ...universityFields(ssot.education, newId),
    },
    careers: careerFields(ssot.careers ?? []),
    certificates: certificateFields(ssot.certifications ?? []),
  };
}

/**
 * @param {SkCareersSsot['careers'] & object} careers
 * @returns {FormObject}
 */
function careerFields(careers) {
  const items = careers.filter((career) => career.company).slice(0, SK_CAREER_LIMIT);
  const periods = items.map((career) => parsePeriod(career.period));
  return columns(items.length, {
    carSeq: () => '0',
    carCorpName: (i) => String(items[i].company),
    carDeptName: () => '',
    carJobRole: (i) => items[i].role ?? '',
    carPosition: () => '',
    carWorkingYN: (i) => (periods[i].isCurrent ? '1' : '0'),
    carSalary: () => '',
    carFromDate: (i) => yearMonth(periods[i].startsAt),
    carToDate: (i) => (periods[i].isCurrent ? '' : yearMonth(periods[i].endsAt)),
    carDescription: (i) => items[i].description?.trim() ?? '',
    carRetireDesc: () => '',
  });
}

/**
 * @param {NonNullable<SkCareersSsot['certifications']>} certifications
 * @returns {FormObject}
 */
function certificateFields(certifications) {
  const items = certifications
    .filter((cert) => cert.name && cert.status === 'active')
    .sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))
    .slice(0, SK_CERT_LIMIT);
  return columns(items.length, {
    cerSeq: () => '0',
    cerCertName: (i) => String(items[i].name),
    cerCertSource: (i) => items[i].issuer ?? '',
    cerCertDate: (i) => yearMonth(items[i].date),
    cerCertNumber: () => '',
    cerCertFilePath: () => '',
    cerCertFileText: () => '',
    cerCertFileName: () => '',
  });
}

/**
 * @param {SkCareersSsot['education']} education
 * @param {() => string} newId
 * @returns {FormObject}
 */
function universityFields(education, newId) {
  if (!education?.school) return {};
  return {
    eduSeq: '0',
    eduUnivRandom: newId(),
    eduUnivRequired: '0',
    eduEducationType: /전문|2년|3년/.test(education.schoolType ?? '') ? '308002' : '308003',
    eduEducationStatus: educationStatus(education.status),
    eduEducationName: education.school,
    eduEducationRegion: '',
    eduDaytimeYN: '',
    eduMajorFamily: /컴퓨터|소프트웨어|정보|통신|전산/.test(education.major ?? '') ? '107021' : '',
    eduMajor: education.major ?? '',
    eduFromDate: yearMonth(education.startDate),
    eduToDate: yearMonth(education.endDate),
  };
}

/**
 * The site only records the graduation year for the high school, so the month is February,
 * when Korean high schools graduate.
 * @param {SkCareersSsot['education']} education
 * @param {() => string} newId
 * @returns {FormObject}
 */
function highSchoolFields(education, newId) {
  if (!education?.highSchool) return {};
  return {
    eduhgSeq: '0',
    eduhgRandom: newId(),
    eduhgRequired: '0',
    eduhgEducationType: '308001',
    eduhgEducationStatus: '309003',
    eduhgQualificationExamYN: '0',
    eduhgEducationName: education.highSchool,
    eduhgToDate: education.highSchoolGraduation ? `${education.highSchoolGraduation}-02` : '',
  };
}

/**
 * @param {SkCareersSsot['military']} military
 * @returns {FormObject}
 */
function militaryFields(military) {
  if (!military?.status) return {};
  const period = parsePeriod(military.period);
  const type = MILITARY_TYPES.find(([pattern]) => pattern.test(String(military.status)))?.[1];
  return {
    prsMilitarySvcYN: '1',
    prsMilitarySvcStatus: /면제/.test(military.status)
      ? '302003'
      : period.endsAt
        ? '302001'
        : '302004',
    prsMilitarySvcType: type ?? '303001',
    prsMilitarySvcFromDate: yearMonth(period.startsAt),
    prsMilitarySvcToDate: yearMonth(period.endsAt),
  };
}

/**
 * @param {string | undefined} status
 * @returns {string}
 */
function educationStatus(status) {
  if (/예정/.test(status ?? '')) return '309002';
  if (/재학/.test(status ?? '')) return '309001';
  if (/휴학/.test(status ?? '')) return '309005';
  return '309003';
}

/**
 * @param {number} count
 * @param {Record<string, (index: number) => string>} builders
 * @returns {FormObject}
 */
function columns(count, builders) {
  if (count === 0) return {};
  return Object.fromEntries(
    Object.entries(builders).map(([field, build]) => {
      const values = Array.from({ length: count }, (_, i) => build(i));
      return [field, count === 1 ? values[0] : values];
    })
  );
}

/**
 * @param {string | null | undefined} date "YYYY.MM", "YYYY-MM" or "YYYY-MM-DD"
 * @returns {string} "YYYY-MM", or '' when there is no date
 */
function yearMonth(date) {
  const match = String(date ?? '').match(/^(\d{4})[.-](\d{1,2})/);
  return match ? `${match[1]}-${match[2].padStart(2, '0')}` : '';
}
