import { normalizeCompanyName, normalizeWorkTypeForProfile } from '@resume/shared/normalize';
import {
  EMPTY_CAREER_FIELDS_PRE_RETIRE,
  EMPTY_CAREER_FIELDS_POST_RETIRE,
  JK_RANK_CODES,
} from './constants.js';
import { parseRange, pushField } from './validators.js';

// The editor's 재직중 checkbox writes 3 when checked; stored resigned rows read 2. Checking it also
// fills the end month (CEYM) with the current month, and the save rejects a career without one.
const RETIRE_ST = { employed: 3, retired: 2 };
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * @param {number} now epoch milliseconds
 * @returns {string} the current Korean month as YYYYMM
 */
function currentKstMonth(now) {
  return new Date(now + KST_OFFSET_MS).toISOString().slice(0, 7).replace('-', '');
}

/**
 * @typedef {{
 *   headline?: string;
 *   paragraphs?: string[];
 *   closing?: string;
 * }} KoCareerSummary
 *
 * @typedef {{
 *   name?: string;
 *   description?: string;
 * }} CareerProject
 *
 * @typedef {{
 *   period?: string;
 *   company?: string;
 *   department?: string;
 *   role?: string;
 *   rank?: string;
 *   jobkoreaRetireReasonCode?: string | number;
 *   jobkoreaRetireReason?: string;
 *   jobkoreaJobCode?: string;
 *   myRole?: string;
 *   project?: string;
 *   client?: string;
 *   teamSize?: string | number;
 *   workType?: string;
 *   projects?: CareerProject[];
 * }} CareerEntry
 *
 * @typedef {{
 *   careerSummary?: {
 *     ko?: KoCareerSummary;
 *   };
 *   careers?: CareerEntry[];
 *   platformVariants?: {
 *     jobkorea?: {
 *       defaultRetireReasonCode?: string | number;
 *       defaultRetireReason?: string;
 *       defaultJobCode?: string;
 *     };
 *   };
 * }} CareerSsot
 */

/**
 * @param {CareerSsot | null | undefined} ssot
 * @returns {string}
 */
function buildCareerSummary(ssot) {
  const careerSummary = ssot?.careerSummary?.ko;
  if (/** @type {number} */ (careerSummary?.paragraphs?.length) > 0) {
    return [
      /** @type {KoCareerSummary} */ (careerSummary).headline,
      '',
      .../** @type {string[]} */ (/** @type {KoCareerSummary} */ (careerSummary).paragraphs),
      '',
      /** @type {KoCareerSummary} */ (careerSummary).closing,
    ]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 2000);
  }

  return '';
}

/**
 * Map careers to JobKorea form fields.
 * @param {CareerSsot | null | undefined} ssot - SSOT resume data
 * @param {string[]} [indices] - Server-generated entry indices (e.g. ['c14','c844','c845']).
 * @param {number} [now] - epoch milliseconds; a current career ends in this month
 * @returns {Array<{ name: string, value: string }>}
 */
export function mapCareersToFormFields(ssot, indices, now = Date.now()) {
  const careers = Array.isArray(ssot?.careers) ? ssot.careers : [];
  if (careers.length === 0) return [];

  /** @type {Array<{ name: string, value: string }>} */
  const fields = [];
  const keys =
    indices && indices.length >= careers.length ? indices : careers.map((_, i) => `c${i + 1}`);

  careers.forEach((career, idx) => {
    if (idx >= keys.length) return;
    const key = keys[idx];
    const { start, end, isCurrent } = parseRange(career?.period || '');

    pushField(fields, `Career[${key}].Index_Name`, key);
    pushField(fields, `Career[${key}].C_Name`, normalizeCompanyName(career?.company));
    EMPTY_CAREER_FIELDS_PRE_RETIRE.forEach((name) =>
      pushField(fields, `Career[${key}].${name}`, '')
    );
    pushField(fields, `Career[${key}].C_Part`, career?.department || '');
    pushField(fields, `Career[${key}].CSYM`, start);
    pushField(fields, `Career[${key}].CEYM`, isCurrent ? currentKstMonth(now) : end);
    pushField(
      fields,
      `Career[${key}].RetireSt`,
      isCurrent ? RETIRE_ST.employed : RETIRE_ST.retired
    );
    const retireReasonCode = isCurrent
      ? ''
      : (career?.jobkoreaRetireReasonCode ??
        ssot?.platformVariants?.jobkorea?.defaultRetireReasonCode ??
        '');
    const retireReason = isCurrent
      ? ''
      : (career?.jobkoreaRetireReason ??
        ssot?.platformVariants?.jobkorea?.defaultRetireReason ??
        '');
    pushField(fields, `Career[${key}].Retire_Rsn_Code`, retireReasonCode);
    pushField(fields, `Career[${key}].Retire_Rsn`, retireReason);
    // 직급 is the Rank_Sub_Code radio; the hidden legacy M_MainJob_Jikwi keeps one character.
    pushField(fields, `Career[${key}].Rank_Sub_Code`, JK_RANK_CODES[career?.rank ?? ''] ?? '');
    pushField(fields, `Career[${key}].M_MainJob_Jikwi`, '');
    pushField(fields, `Career[${key}].Job_Type_Code`, '');
    const jobCode =
      career?.jobkoreaJobCode || ssot?.platformVariants?.jobkorea?.defaultJobCode || '';
    pushField(fields, `Career[${key}].M_MainField`, jobCode);
    EMPTY_CAREER_FIELDS_POST_RETIRE.forEach((name) =>
      pushField(fields, `Career[${key}].${name}`, '')
    );
    pushField(
      fields,
      `Career[${key}].Prfm_Prt`,
      String(career?.myRole || career?.project || career?.role || '').slice(0, 500)
    );
    pushField(fields, `Career[${key}].CNameHold`, '0');
    pushField(fields, `Career[${key}].OpenStat`, '1');
    pushField(fields, `Career[${key}].C_Client`, career?.client || '');
    pushField(fields, `Career[${key}].C_TeamSize`, String(career?.teamSize || ''));
    pushField(fields, `Career[${key}].C_MyRole`, career?.myRole || '');
    pushField(fields, `Career[${key}].C_WorkType`, normalizeWorkTypeForProfile(career?.workType));
    if (Array.isArray(career?.projects)) {
      career.projects.forEach((project, pIdx) => {
        const pKey = `p${pIdx + 1}`;
        pushField(fields, `Career[${key}].Project[${pKey}].P_Name`, project?.name || '');
        pushField(
          fields,
          `Career[${key}].Project[${pKey}].P_Cntnt`,
          String(project?.description || '').slice(0, 500)
        );
      });
    }
  });

  keys.slice(0, careers.length).forEach((key) => pushField(fields, 'Career.index', key));
  pushField(fields, 'UserResume.M_Career_Text', buildCareerSummary(ssot));
  pushField(fields, 'UserResume.M_Career_Text_Stat', '1');
  pushField(fields, 'InputStat.CareerInputStat', 'True');
  return fields;
}

export { normalizeCompanyName };
