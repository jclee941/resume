import { WantedAPI, WantedAPIError } from '@resume/shared/clients/wanted';
import { refreshWantedSession } from '../../handlers/wanted/mint-session.js';
import { readPlatformSession } from '../../services/platform-session.js';

/**
 * @typedef {import('../../handlers/wanted/mint-session.js').WantedEnv & {
 *   SESSIONS: { get: Function; put: Function };
 *   ENCRYPTION_KEY?: string;
 * }} WantedSubmitEnv
 */

/**
 * @param {WantedSubmitEnv} env
 * @param {string} jobId
 * @returns {Promise<import('./application-submitters.js').SubmitResult>}
 */
export async function submitWantedApplication(env, jobId) {
  try {
    const result = await applyWithWantedSession(env, jobId);
    if (result.alreadyApplied) {
      return {
        success: false,
        alreadyApplied: true,
        status: 'already_applied',
        platform: 'wanted',
      };
    }
    return { success: true, platform: 'wanted', platformResponse: result };
  } catch (error) {
    return { success: false, platform: 'wanted', error: describeWantedError(error) };
  }
}

/**
 * Uses the KV session, minting a fresh one when KV has none or Wanted rejects it.
 * @param {WantedSubmitEnv} env
 * @param {string} jobId
 * @returns {Promise<Awaited<ReturnType<WantedAPI['apply']>>>}
 */
async function applyWithWantedSession(env, jobId) {
  const stored = await readPlatformSession(env, 'wanted');
  if (stored) {
    try {
      return await new WantedAPI(stored).apply(jobId);
    } catch (error) {
      if (!isRejectedSession(error)) throw error;
    }
  }
  const refreshed = await refreshWantedSession(env);
  if (!refreshed.ok) throw new Error(`Wanted session refresh failed: ${refreshed.error}`);
  const minted = await readPlatformSession(env, 'wanted');
  if (!minted) throw new Error('No Wanted session after refresh');
  return new WantedAPI(minted).apply(jobId);
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
function isRejectedSession(error) {
  return error instanceof WantedAPIError && [401, 403].includes(Number(error.statusCode));
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function describeWantedError(error) {
  if (error instanceof WantedAPIError) {
    const detail = String(error.response || error.message).slice(0, 300);
    return `Wanted API error: ${error.statusCode ?? 'n/a'} - ${detail}`;
  }
  return error instanceof Error ? error.message : String(error);
}
