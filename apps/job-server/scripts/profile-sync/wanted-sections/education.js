import { CONFIG } from '../constants.js';
import { log } from '../sync-logger.js';
import { formatYYYY_MM_DD } from '../../../src/shared/utils/date-formatters.js';
import { normalizeEducationStatus } from '@resume/shared/normalize';

// Map SSoT schoolType to a Wanted degree label.
const DEGREE_BY_SCHOOL_TYPE = {
  '4년제': '학사',
  '2년제': '전문학사',
  대학원: '석사',
  석사: '석사',
  박사: '박사',
};

function mapEducationToWanted(ssotEducation) {
  const isAttending = normalizeEducationStatus(ssotEducation.status) === '재학중';
  return {
    school_name: ssotEducation.school,
    major: ssotEducation.major,
    major_type: ssotEducation.majorType || '전공',
    start_time: formatYYYY_MM_DD(ssotEducation.startDate),
    end_time: isAttending ? null : formatYYYY_MM_DD(ssotEducation.endDate),
    is_attending: isAttending,
    degree: DEGREE_BY_SCHOOL_TYPE[ssotEducation.schoolType] || '학사',
  };
}

/** @param {Object} client @param {Object} ssot @param {Object} profile @param {string} resumeId @returns {Promise<Object>} */
export async function syncWantedEducations(client, ssot, profile, resumeId) {
  const ssotEducation = ssot.education;
  const wantedEducations = profile.educations || [];

  log(`Education: SSOT has 1, Wanted has ${wantedEducations.length}`, 'info', 'wanted');
  const wantedEdu = wantedEducations.find((w) => w.name && w.name.includes(ssotEducation.school));
  const ssotData = mapEducationToWanted(ssotEducation);

  if (!CONFIG.APPLY || CONFIG.DIFF_ONLY) {
    if (wantedEdu) console.log(`  = ${ssotEducation.school} (already exists)`);
    else console.log(`  + ${ssotEducation.school}: ${ssotEducation.major}`);
    return { changes: wantedEdu ? 0 : 1, updated: 0, added: 0, dryRun: true };
  }
  if (wantedEdu) return { changes: 0, updated: 0, added: 0 };

  try {
    await client.addEducation(resumeId, ssotData);
    log(`Added education: ${ssotEducation.school}`, 'success', 'wanted');
    return { changes: 1, updated: 0, added: 1 };
  } catch (e) {
    log(`Failed to add education: ${e.message}`, 'error', 'wanted');
    return { changes: 0, updated: 0, added: 0 };
  }
}
