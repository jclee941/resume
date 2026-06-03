import { CONFIG } from '../constants.js';
import { log } from '../sync-logger.js';
import { WANTED_ABOUT_LIMIT } from '../../../src/tools/platforms/wanted-sync-operations.js';

/** @param {Object} client @param {Object} ssot @param {Object} resumeDetail @param {string} resumeId @returns {Promise<Object>} */
export async function syncWantedAbout(client, ssot, resumeDetail, resumeId) {
  // Prefer the Wanted-specific SSoT variant when present, else fall back to the
  // generic profile statement.
  const rawAbout = ssot.platformVariants?.wanted?.about || ssot.summary?.profileStatement || '';
  // Wanted about field has a 3000-char limit (WANTED_ABOUT_LIMIT). Truncate with ellipsis.
  const ssotAbout =
    rawAbout.length > WANTED_ABOUT_LIMIT
      ? `${rawAbout.slice(0, WANTED_ABOUT_LIMIT - 3)}...`
      : rawAbout;
  const wantedAbout = resumeDetail?.about || '';

  if (ssotAbout === wantedAbout) {
    log('About: no changes', 'info', 'wanted');
    return { changes: 0 };
  }

  log(
    `About: "${wantedAbout.slice(0, 30)}..." -> "${ssotAbout.slice(0, 30)}..."`,
    'diff',
    'wanted'
  );
  if (!CONFIG.APPLY || CONFIG.DIFF_ONLY) return { changes: 1, dryRun: true };

  try {
    await client.updateResumeFields(resumeId, { about: ssotAbout });
    log('Updated about field', 'success', 'wanted');
    return { changes: 1, updated: 1 };
  } catch (e) {
    log(`Failed to update about: ${e.message}`, 'error', 'wanted');
    return { changes: 0 };
  }
}
