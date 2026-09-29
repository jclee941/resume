import { pushField } from './validators.js';

const INTRO_HEADER_LIMIT = 50;
const INTRO_CONTENT_LIMIT = 2000;

/**
 * @typedef {{
 *   about?: string;
 *   headline?: string;
 * }} JobKoreaVariant
 */

/**
 * @typedef {{
 *   headline?: string;
 *   paragraphs?: string[];
 *   closing?: string;
 * }} CoverLetterKo
 */

/**
 * @typedef {{
 *   platformVariants?: {
 *     jobkorea?: JobKoreaVariant;
 *   };
 *   coverLetter?: {
 *     ko?: CoverLetterKo;
 *   };
 * }} IntroSsot
 */

/**
 * @param {JobKoreaVariant | null | undefined} jobkoreaVariant
 * @param {CoverLetterKo | null | undefined} coverLetter
 * @returns {string}
 */
function buildIntroContent(jobkoreaVariant, coverLetter) {
  if (jobkoreaVariant?.about) {
    return String(jobkoreaVariant.about).slice(0, INTRO_CONTENT_LIMIT);
  }

  const paragraphs = Array.isArray(coverLetter?.paragraphs) ? coverLetter.paragraphs : [];
  if (paragraphs.length === 0) return '';
  return [...paragraphs, coverLetter?.closing || '']
    .filter(Boolean)
    .join('\n\n')
    .slice(0, INTRO_CONTENT_LIMIT);
}

/**
 * @param {IntroSsot | null | undefined} ssot
 * @param {string[] | null | undefined} [indices]
 * @returns {Array<{ name: string, value: string }>}
 */
export function mapIntroToFormFields(ssot, indices) {
  const jobkoreaVariant = ssot?.platformVariants?.jobkorea || {};
  const coverLetter = ssot?.coverLetter?.ko;
  const paragraphs = Array.isArray(coverLetter?.paragraphs) ? coverLetter.paragraphs : [];
  if (!jobkoreaVariant.about && paragraphs.length === 0) return [];

  const key = indices?.[0] || 'c1';
  /** @type {Array<{ name: string, value: string }>} */
  const fields = [];
  const header = jobkoreaVariant.headline || coverLetter?.headline || '';
  pushField(fields, 'ResumeProfile.Index', key);
  pushField(fields, `ResumeProfile[${key}].Header`, String(header).slice(0, INTRO_HEADER_LIMIT));
  pushField(
    fields,
    `ResumeProfile[${key}].Contents`,
    buildIntroContent(jobkoreaVariant, coverLetter)
  );
  pushField(fields, 'InputStat.UserIntroduceInputStat', 'True');
  return fields;
}
