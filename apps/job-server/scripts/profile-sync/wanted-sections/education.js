import { CONFIG } from '../constants.js';
import { log } from '../sync-logger.js';

function mapEducationToWanted(ssotEducation) {
  return {
    school_name: ssotEducation.school,
    major: ssotEducation.major,
    start_time: `${ssotEducation.startDate.replace('.', '-')}-01`,
    end_time: null,
    degree: '학사',
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
