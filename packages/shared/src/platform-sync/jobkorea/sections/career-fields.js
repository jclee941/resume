import {
  normalizeCareerRole,
  normalizeCompanyName,
  normalizeWorkTypeForProfile,
} from '@resume/shared/normalize';
import { EMPTY_CAREER_FIELDS_PRE_RETIRE, EMPTY_CAREER_FIELDS_POST_RETIRE } from './constants.js';
import { parseRange, pushField } from './validators.js';

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
 * @returns {Array<{ name: string, value: string }>}
 */
export function mapCareersToFormFields(ssot, indices) {
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
    pushField(fields, `Career[${key}].CEYM`, end);
    pushField(fields, `Career[${key}].RetireSt`, isCurrent ? 1 : 2);
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
    pushField(fields, `Career[${key}].M_MainJob_Jikwi`, normalizeCareerRole(career?.role));
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
