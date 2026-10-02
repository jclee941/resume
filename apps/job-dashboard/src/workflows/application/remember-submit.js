import { RememberApiError } from '../../services/remember/remember-api.js';
import {
  applyWithProfile,
  createProfileSnapshot,
  getAccountContact,
  getApplicationStatus,
  getMissingApplicationFields,
} from '../../services/remember/remember-jobs.js';
import { withBrowserFetchRetry } from '../../services/remember/remember-retry.js';
import { withRememberToken } from '../../services/remember/remember-session.js';

/**
 * @typedef {import('../../services/remember/remember-session.js').RememberEnv} RememberSubmitEnv
 * @typedef {import('./application-submitters.js').SubmitResult} SubmitResult
 */

/**
 * Applies to a Remember posting with the open profile, snapshotting the profile for the posting
 * first as the web app does. A posting the account already applied to is reported as already
 * applied, and one that asks for fields the profile lacks is not submitted. The reads and the
 * snapshot are retried once after a failed browser fetch; the apply request is not, so it is
 * never sent twice.
 * @param {RememberSubmitEnv} env
 * @param {string} jobId `remember-<posting id>` or the bare id
 * @returns {Promise<SubmitResult>}
 */
export async function submitRememberApplication(env, jobId) {
  const postingId = String(jobId).replace(/^remember-/, '');
  try {
    return await withRememberToken(env, async (token, fetchImpl) => {
      if (await withBrowserFetchRetry(() => getApplicationStatus(token, postingId, fetchImpl))) {
        return {
          success: false,
          alreadyApplied: true,
          status: 'already_applied',
          platform: 'remember',
        };
      }
      const missing = await withBrowserFetchRetry(() =>
        getMissingApplicationFields(token, postingId, fetchImpl)
      );
      if (missing.length > 0) {
        return {
          success: false,
          platform: 'remember',
          error: `Remember posting ${postingId} asks for ${missing.join(', ')}, which the profile does not have`,
        };
      }
      const contact = await withBrowserFetchRetry(() => getAccountContact(token, fetchImpl));
      await withBrowserFetchRetry(() => createProfileSnapshot(token, postingId, fetchImpl));
      await applyWithProfile(token, postingId, contact, fetchImpl);
      return {
        success: true,
        platform: 'remember',
        platformResponse: { postingId, source: 'profile' },
      };
    });
  } catch (error) {
    return { success: false, platform: 'remember', error: describeRememberError(error) };
  }
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function describeRememberError(error) {
  if (error instanceof RememberApiError) {
    const detail = typeof error.body === 'string' ? error.body : JSON.stringify(error.body);
    return `${error.message}: ${String(detail).slice(0, 300)}`;
  }
  return error instanceof Error ? error.message : String(error);
}
