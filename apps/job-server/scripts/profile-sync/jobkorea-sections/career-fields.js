import { normalizeCompanyName } from '@resume/shared/normalize';
import { EMPTY_CAREER_FIELDS } from './constants.js';
import { parseRange, pushField } from './validators.js';

function buildCareerSummary(ssot) {
  const careerSummary = ssot?.careerSummary?.ko;
  if (careerSummary?.paragraphs?.length > 0) {
    return [careerSummary.headline, '', ...careerSummary.paragraphs, '', careerSummary.closing]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 2000);
  }

  const koreanCoverLetter = ssot?.coverLetter?.ko;
  const coverParagraphs = koreanCoverLetter?.paragraphs;
  if (!Array.isArray(coverParagraphs) || coverParagraphs.length === 0) return '';
  return [koreanCoverLetter?.headline, '', ...coverParagraphs, '', koreanCoverLetter?.closing]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 2000);
}

/**
 * Map careers to JobKorea form fields.
 * @param {object} ssot - SSOT resume data
 * @param {string[]} [indices] - Server-generated entry indices (e.g. ['c14','c844','c845']).
 */
export function mapCareersToFormFields(ssot, indices) {
  const careers = Array.isArray(ssot?.careers) ? ssot.careers : [];
  if (careers.length === 0) return [];

  const fields = [];
  const keys =
    indices && indices.length >= careers.length ? indices : careers.map((_, i) => `c${i + 1}`);

  careers.forEach((career, idx) => {
    if (idx >= keys.length) return;
    const key = keys[idx];
    const { start, end, isCurrent } = parseRange(career?.period || '');

    pushField(fields, `Career[${key}].Index_Name`, key);
    pushField(fields, `Career[${key}].C_Name`, normalizeCompanyName(career?.company));
    EMPTY_CAREER_FIELDS.slice(0, 7).forEach((name) =>
      pushField(fields, `Career[${key}].${name}`, '')
    );
    pushField(fields, `Career[${key}].C_Part`, career?.department || '');
    pushField(fields, `Career[${key}].CSYM`, start);
    pushField(fields, `Career[${key}].CEYM`, end);
    pushField(fields, `Career[${key}].RetireSt`, isCurrent ? 1 : 2);
    const jikwiText = String(career?.role || '').replace(/ 담당$/, '');
    pushField(fields, `Career[${key}].M_MainJob_Jikwi`, jikwiText);
    pushField(fields, `Career[${key}].Job_Type_Code`, '');
    const jobCode = career?.jobkoreaJobCode || ssot?.platformVariants?.jobkorea?.defaultJobCode || '';
    pushField(fields, `Career[${key}].M_MainField`, jobCode);
    EMPTY_CAREER_FIELDS.slice(7).forEach((name) => pushField(fields, `Career[${key}].${name}`, ''));
    pushField(fields, `Career[${key}].Prfm_Prt`, String(career?.project || career?.role || '').slice(0, 500));
    pushField(fields, `Career[${key}].CNameHold`, '0');
    pushField(fields, `Career[${key}].OpenStat`, '1');
    pushField(fields, `Career[${key}].C_Client`, career?.client || '');
    pushField(fields, `Career[${key}].C_TeamSize`, String(career?.teamSize || ''));
    pushField(fields, `Career[${key}].C_MyRole`, career?.myRole || '');
    pushField(fields, `Career[${key}].C_WorkType`, career?.workType || '');
    if (Array.isArray(career?.projects)) {
      career.projects.forEach((project, pIdx) => {
        const pKey = `p${pIdx + 1}`;
        pushField(fields, `Career[${key}].Project[${pKey}].P_Name`, project?.name || '');
        pushField(fields, `Career[${key}].Project[${pKey}].P_Cntnt`, String(project?.description || '').slice(0, 500));
      });
    }
    pushField(fields, `Career[${key}].CNameHold`, '0');
    pushField(fields, `Career[${key}].OpenStat`, '1');
  });

  pushField(fields, 'Career.index', keys.slice(0, careers.length).join(','));
  pushField(fields, 'UserResume.M_Career_Text', buildCareerSummary(ssot));
  pushField(fields, 'UserResume.M_Career_Text_Stat', '1');
  pushField(fields, 'InputStat.CareerInputStat', 'True');
  return fields;
}

export { normalizeCompanyName };
