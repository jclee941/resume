import { ValidationError } from '../../shared/errors/apply-errors.js';
import SessionManager from '../../shared/services/session/index.js';

export const WANTED_PLATFORM = 'wanted';

/**
 * @typedef {{
 *   email?: string,
 *   username?: string,
 *   mobile?: string,
 *   [key: string]: unknown,
 * }} WantedSession
 *
 * @typedef {{
 *   id?: string | number,
 *   [key: string]: unknown,
 * }} WantedJob
 *
 * @typedef {{
 *   email?: string,
 *   username?: string,
 *   mobile?: string,
 *   nationality_code?: string,
 *   visa?: string | null,
 *   extraPayload?: Record<string, unknown>,
 *   [key: string]: unknown,
 * }} WantedApplyOptions
 *
 * @typedef {{
 *   name?: string,
 *   mobile?: string,
 *   [key: string]: unknown,
 * }} WantedProfileData
 */

/**
 * @param {string | number | null | undefined} jobId
 * @returns {number | null}
 */
export function parseWantedJobId(jobId) {
  if (typeof jobId === 'number') {
    return Number.isSafeInteger(jobId) && jobId > 0 ? jobId : null;
  }

  if (typeof jobId !== 'string') {
    return null;
  }

  const match = /^(?:wanted_)?(\d+)$/.exec(jobId.trim());
  if (!match) {
    return null;
  }

  const numericJobId = Number(match[1]);
  return Number.isSafeInteger(numericJobId) && numericJobId > 0 ? numericJobId : null;
}

/**
 * @param {string | number | null | undefined} jobId
 * @returns {string | null}
 */
export function buildWantedJobUrl(jobId) {
  const numericJobId = parseWantedJobId(jobId);
  if (numericJobId === null) {
    return null;
  }
  return `https://www.wanted.co.kr/wd/${numericJobId}`;
}

/**
 * @param {WantedJob} job
 * @param {WantedApplyOptions} options
 * @param {string | number | null | undefined} [resumeKey]
 * @param {WantedProfileData} [profileData]
 * @returns {Record<string, unknown>}
 */
export function buildApplicationPayload(job, options, resumeKey, profileData = {}) {
  const numericJobId = parseWantedJobId(job.id);
  if (numericJobId === null) {
    throw new ValidationError(
      'Invalid Wanted job.id; expected a numeric ID or wanted_<numeric ID>',
      {
        platform: WANTED_PLATFORM,
        metadata: { jobId: job.id },
      }
    );
  }

  const session =
    /** @type {(platform?: string | null) => WantedSession | null} */ (SessionManager.load)(
      WANTED_PLATFORM
    ) || {};
  const extraPayload = options.extraPayload ? { ...options.extraPayload } : {};

  return {
    ...extraPayload,
    email: session.email || options.email || '',
    username: profileData.name || options.username || session.username || '',
    mobile: profileData.mobile || options.mobile || session.mobile || '',
    job_id: numericJobId,
    resume_keys: resumeKey ? [resumeKey] : [],
    nationality_code: options.nationality_code || 'KR',
    visa: options.visa || null,
    status: 'apply',
  };
}
