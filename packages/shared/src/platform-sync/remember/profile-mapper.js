import { formatYYYY_MM_DD, parsePeriod } from '../date-formatters.js';
import { appendedInfoChanges, languageChanges, skillAdditions } from './profile-lists.js';

const DESCRIPTION_LIMIT = 5000;

/**
 * @typedef {{
 *   id?: number;
 *   company?: string;
 *   position?: string | null;
 *   joined_date?: string | null;
 *   left_date?: string | null;
 *   present?: boolean;
 *   main?: boolean;
 *   description?: string | null;
 *   open_description?: string | null;
 *   visibility?: string;
 *   _destroy?: boolean;
 * }} RememberCareer
 * @typedef {{
 *   id?: number;
 *   school?: string;
 *   degree?: string | null;
 *   major?: string | null;
 *   joined_date?: string | null;
 *   left_date?: string | null;
 *   present?: boolean;
 *   visibility?: string;
 * }} RememberAcademic
 * @typedef {{
 *   introduction?: string | null;
 *   headline?: string | null;
 *   careers_attributes?: RememberCareer[];
 *   academic_histories_attributes?: RememberAcademic[];
 *   skills_attributes?: import('./profile-lists.js').RememberSkill[];
 *   appended_info_attributes?: import('./profile-lists.js').RememberAppendedInfo[];
 *   languages_attributes?: import('./profile-lists.js').RememberLanguage[];
 * }} RememberOpenProfile
 * @typedef {{
 *   company?: string;
 *   period?: string;
 *   role?: string;
 *   description?: string;
 *   wantedSummary?: string;
 *   projects?: Array<{ name?: string; description?: string; achievements?: string[] }>;
 * }} SsotCareer
 * @typedef {import('./profile-lists.js').RememberListSource & {
 *   careers?: SsotCareer[];
 *   education?: { school?: string; major?: string; startDate?: string; endDate?: string; status?: string };
 *   platformVariants?: Record<string, { headline?: string; about?: string } | undefined>;
 * }} RememberSsot
 */

/**
 * The PUT /v2/open_profiles/{id} body that brings the open profile in line with the SSoT. Only
 * sections that differ are included, so an up-to-date profile maps to an empty object.
 * Careers and the school are matched by name and updated in place. Careers the SSoT does not
 * list are removed; when that removes the main career, the newest SSoT career becomes main.
 * @param {RememberSsot} ssot
 * @param {RememberOpenProfile & { id?: number }} current
 * @returns {RememberOpenProfile}
 */
export function mapToRememberProfile(ssot, current) {
  const variant = ssot.platformVariants?.remember ?? ssot.platformVariants?.wanted;
  /** @type {RememberOpenProfile} */
  const profile = {};
  const introduction = variant?.about?.trim();
  if (introduction && introduction !== current.introduction) profile.introduction = introduction;
  const headline = variant?.headline?.trim();
  if (headline && headline !== current.headline) profile.headline = headline;
  setIfAny(
    profile,
    'careers_attributes',
    careerChanges(ssot.careers ?? [], current.careers_attributes ?? [])
  );
  setIfAny(
    profile,
    'academic_histories_attributes',
    academicChanges(ssot, current.academic_histories_attributes ?? [])
  );
  setIfAny(profile, 'skills_attributes', skillAdditions(ssot, current.skills_attributes ?? []));
  setIfAny(
    profile,
    'appended_info_attributes',
    appendedInfoChanges(ssot, current.appended_info_attributes ?? [])
  );
  setIfAny(
    profile,
    'languages_attributes',
    languageChanges(ssot, current.languages_attributes ?? [])
  );
  return profile;
}

/**
 * @param {SsotCareer[]} careers
 * @param {RememberCareer[]} current
 * @returns {RememberCareer[]}
 */
function careerChanges(careers, current) {
  /** @type {RememberCareer[]} */
  const changes = [];
  const desired = careers
    .filter((career) => career.company)
    .map((career) => {
      const period = parsePeriod(career.period);
      return {
        company: career.company,
        position: career.role || null,
        joined_date: period.startsAt || null,
        left_date: period.isCurrent ? null : period.endsAt,
        present: period.isCurrent,
        description: careerDescription(career),
        open_description: career.wantedSummary?.trim() || null,
      };
    });
  const matches = matchCareers(desired, current);
  /** @type {Array<RememberCareer | undefined>} */
  const updates = desired.map((career, i) => {
    const existing = matches[i];
    if (!existing) return { ...career, main: false, visibility: 'public' };
    return differs(existing, career) ? { id: existing.id, ...career } : undefined;
  });
  for (const update of updates) {
    if (update) changes.push(update);
  }
  const stale = current.filter((entry) => !matches.includes(entry));
  for (const entry of stale) changes.push({ id: entry.id, _destroy: true });
  if (desired.length > 0 && !current.some((entry) => entry.main && !stale.includes(entry))) {
    if (updates[0]) updates[0].main = true;
    else if (matches[0]) changes.push({ id: matches[0].id, main: true });
  }
  return changes;
}

/**
 * Pair each SSoT career with a current one of the same company, same start date first, so two
 * stints at one company each keep their own entry.
 * @param {RememberCareer[]} desired
 * @param {RememberCareer[]} current
 * @returns {Array<RememberCareer | undefined>}
 */
function matchCareers(desired, current) {
  /** @type {Array<RememberCareer | undefined>} */
  const matches = desired.map(() => undefined);
  for (const sameStart of [true, false]) {
    desired.forEach((career, i) => {
      if (matches[i]) return;
      matches[i] = current.find(
        (entry) =>
          !matches.includes(entry) &&
          sameName(entry.company, career.company) &&
          (!sameStart || entry.joined_date === career.joined_date)
      );
    });
  }
  return matches;
}

/**
 * @param {RememberSsot} ssot
 * @param {RememberAcademic[]} current
 * @returns {RememberAcademic[]}
 */
function academicChanges(ssot, current) {
  const education = ssot.education;
  if (!education?.school) return [];
  const existing = current.find((entry) => sameName(entry.school, education.school));
  const desired = {
    school: education.school,
    major: education.major || null,
    joined_date: education.startDate ? formatYYYY_MM_DD(education.startDate) : null,
    left_date: education.endDate ? formatYYYY_MM_DD(education.endDate) : null,
    present: /예정|재학/.test(education.status ?? ''),
  };
  if (!existing) return [{ ...desired, degree: '학사', visibility: 'public' }];
  return differs(existing, desired) ? [{ id: existing.id, ...desired }] : [];
}

/**
 * @param {SsotCareer} career
 * @returns {string | null}
 */
function careerDescription(career) {
  const parts = [career.description?.trim()];
  for (const project of career.projects ?? []) {
    const lines = [project.name ? `[${project.name}]` : '', project.description?.trim() ?? ''];
    lines.push(...(project.achievements ?? []).map((achievement) => `- ${achievement}`));
    parts.push(lines.filter(Boolean).join('\n'));
  }
  const text = parts.filter(Boolean).join('\n\n');
  return text ? text.slice(0, DESCRIPTION_LIMIT) : null;
}

/**
 * @param {Record<string, unknown>} existing
 * @param {Record<string, unknown>} desired
 * @returns {boolean}
 */
function differs(existing, desired) {
  return Object.entries(desired).some(([key, value]) => (existing[key] ?? null) !== value);
}

/**
 * @param {string | undefined} left
 * @param {string | undefined} right
 * @returns {boolean}
 */
function sameName(left, right) {
  const normalize = (/** @type {string | undefined} */ name) =>
    String(name ?? '')
      .replace(/\(주\)|㈜|주식회사|\s+/g, '')
      .toLowerCase();
  return Boolean(normalize(left)) && normalize(left) === normalize(right);
}

/**
 * @template {keyof RememberOpenProfile} K
 * @param {RememberOpenProfile} profile
 * @param {K} key
 * @param {RememberOpenProfile[K]} value
 * @returns {void}
 */
function setIfAny(profile, key, value) {
  if (Array.isArray(value) && value.length > 0) profile[key] = value;
}
