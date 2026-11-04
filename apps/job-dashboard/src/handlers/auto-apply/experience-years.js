/**
 * Required-experience extraction for job postings.
 *
 * Free text only counts when a duration sits in an employment-requirement context: next to
 * 경력/experience, or (job title only) as a range or "N년 이상" form. A structured
 * `experience` field is parsed on its own and may be a bare number or range.
 */

const UNIT = '(?:years?|yrs?|yr|년)';
const RANGE = `\\d+\\s*(?:-|~|–|to)\\s*\\d+\\s*${UNIT}?`;
const PLUS = `\\d+\\s*(?:\\+\\s*${UNIT}?|${UNIT}\\s*(?:\\+|이상|and up))`;
const EXACT = `\\d+\\s*${UNIT}`;
const DURATION = `(?:${RANGE}|${PLUS}|${EXACT})`;
const RANGE_UNIT_REQUIRED = RANGE.replace(new RegExp('\\?$'), '');
const KEYWORD = '(?:경력|experience|career)';
const BEFORE = new RegExp(`${KEYWORD}\\s*[:：]?\\s*(?:최소|약|minimum)?\\s*(${DURATION})`, 'i');
const AFTER = new RegExp(`(${DURATION})\\s*(?:이상|and up)?\\s*(?:의|of)?\\s*${KEYWORD}`, 'i');
const TITLE_FORM = new RegExp(`(${RANGE_UNIT_REQUIRED}|${PLUS})`, 'i');

/**
 * @param {string} expression one duration expression such as "5-10년", "5년 이상" or "5"
 * @returns {{ min: number, max: number } | null}
 */
function parseDuration(expression) {
  const range = expression.match(/(\d+)\s*(?:-|~|–|to)\s*(\d+)/i);
  if (range) {
    const [first, second] = [Number(range[1]), Number(range[2])];
    return { min: Math.min(first, second), max: Math.max(first, second) };
  }
  const number = expression.match(/\d+/);
  if (!number) return null;
  const years = Number(number[0]);
  const open = /\+|이상|and\s+up/i.test(expression);
  return { min: years, max: open ? Number.POSITIVE_INFINITY : years };
}

/**
 * @param {{ position?: string, description?: string, experience?: string | number }} job
 * @returns {{ min: number, max: number } | null} required years, or null when absent
 */
export function extractRequiredYears(job) {
  if (job.experience !== undefined && job.experience !== null && job.experience !== '') {
    const structured = parseDuration(String(job.experience));
    if (structured) return structured;
  }
  const position = String(job.position || '');
  const description = String(job.description || '');
  for (const text of [position, description]) {
    const hit = text.match(BEFORE) || text.match(AFTER);
    if (hit) return parseDuration(hit[1]);
  }
  const title = position.match(TITLE_FORM);
  return title ? parseDuration(title[1]) : null;
}
