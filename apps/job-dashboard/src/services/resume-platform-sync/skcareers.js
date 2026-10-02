import {
  encodeFormParam,
  mapToSkCareersResume,
  mergeSkCareersResume,
  readResumeForm,
} from '@resume/shared/platform-sync/skcareers';
import { loginSkCareers, readResumeEditor, saveResume } from '../skcareers/skcareers-api.js';

/**
 * @typedef {import('../skcareers/skcareers-api.js').SkCareersEnv} SkCareersSyncEnv
 * @typedef {Parameters<typeof mapToSkCareersResume>[0]} SkCareersSsot
 * @typedef {{ dryRun: boolean; targetResumeId?: string | null; fetchImpl?: typeof fetch }} SkCareersSyncOptions
 */

/**
 * Sync the SSoT resume to the SK Careers MyPage resume: log in, read the saved resume from the
 * editor, lay the SSoT sections over it and save the whole form. The account has one resume, so
 * there is no resume id. Dry runs, and runs with nothing to change, save nothing.
 * @param {SkCareersSyncEnv} env
 * @param {SkCareersSsot} ssot
 * @param {SkCareersSyncOptions} options
 * @returns {Promise<{ platform: 'skcareers'; success: boolean; dryRun: boolean; error?: string; changes?: Record<string, number> }>}
 */
export async function syncSkCareersFromSsot(env, ssot, { dryRun, fetchImpl }) {
  const cookie = await loginSkCareers(env, { fetchImpl });
  const saved = readResumeForm(await readResumeEditor(cookie, { fetchImpl }));
  if (!saved) {
    return {
      platform: 'skcareers',
      success: false,
      dryRun,
      error: 'SK Careers resume editor has no resume form',
    };
  }
  const { form, changes } = mergeSkCareersResume(saved, mapToSkCareersResume(ssot));
  if (dryRun || Object.keys(changes).length === 0) {
    return { platform: 'skcareers', success: true, dryRun, changes };
  }
  await saveResume(cookie, encodeFormParam(form), { fetchImpl });
  return { platform: 'skcareers', success: true, dryRun: false, changes };
}
