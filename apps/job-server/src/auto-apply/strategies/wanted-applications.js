import { ValidationError } from '../../shared/errors/apply-errors.js';
import { WANTED_PLATFORM } from './wanted-id.js';

/**
 * @typedef {Record<string, unknown> & {
 *   application_id?: string | number,
 *   applicationId?: string | number,
 *   id?: string | number,
 *   data?: {
 *     application_id?: string | number,
 *     applicationId?: string | number,
 *     id?: string | number
 *   }
 * }} ApplicationIdContainer
 */

/**
 * @typedef {Record<string, unknown> & {
 *   applications?: unknown,
 *   results?: unknown,
 *   data?: unknown & {
 *     applications?: unknown,
 *     results?: unknown
 *   }
 * }} ApplicationListResponse
 */

/**
 * @typedef {Record<string, unknown> & {
 *   job_id?: string | number,
 *   jobId?: string | number,
 *   position_id?: string | number,
 *   positionId?: string | number,
 *   job?: { id?: string | number }
 * }} ApplicationEntry
 */

/**
 * @typedef {Object} WantedResume
 * @property {string} [key]
 * @property {string} [id]
 * @property {string} [resume_id]
 * @property {string} [uuid]
 * @property {boolean} [is_default]
 */

/**
 * @typedef {Object} WantedApiClient
 * @property {(path: string) => Promise<{ data?: WantedResume[]; [key: string]: unknown }>} chaosRequest
 */

/**
 * @typedef {Object} ResolveResumeKeyOptions
 * @property {string} [resumeKey]
 * @property {string} [resume_key]
 * @property {string} [resumeId]
 * @property {string} [resume_id]
 */

/**
 * @typedef {Object} ResumeKeyContext
 * @property {{ resumeKey?: string, resumeId?: string, [key: string]: unknown }} [config]
 */

/**
 * @param {ApplicationIdContainer | null | undefined} result
 * @returns {string | number | null}
 */
export function extractApplicationId(result) {
  return (
    result?.application_id ??
    result?.applicationId ??
    result?.id ??
    result?.data?.application_id ??
    result?.data?.applicationId ??
    result?.data?.id ??
    null
  );
}

/**
 * @param {ApplicationListResponse | null | undefined} response
 * @returns {ApplicationEntry[]}
 */
export function normalizeApplicationEntries(response) {
  const candidates = [
    response?.applications,
    response?.results,
    response?.data?.applications,
    response?.data?.results,
    response?.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return /** @type {ApplicationEntry[]} */ (candidate);
    }
  }

  return [];
}

/**
 * @param {ApplicationEntry | null | undefined} entry
 * @param {string | number} targetJobId
 * @returns {boolean}
 */
export function isAppliedJob(entry, targetJobId) {
  const postedJobId =
    entry?.job_id ??
    entry?.jobId ??
    entry?.position_id ??
    entry?.positionId ??
    entry?.job?.id ??
    null;

  return String(postedJobId) === String(targetJobId);
}

/**
 * @param {ResumeKeyContext | null | undefined} ctx
 * @param {WantedApiClient} api
 * @param {ResolveResumeKeyOptions} [options]
 * @returns {Promise<string>}
 */
export async function resolveResumeKey(ctx, api, options = {}) {
  const explicitKey =
    options.resumeKey ??
    options.resume_key ??
    options.resumeId ??
    options.resume_id ??
    ctx?.config?.resumeKey ??
    ctx?.config?.resumeId;

  if (explicitKey) return explicitKey;

  const resumes = await api.chaosRequest('/resumes/v1?offset=0&limit=10');
  const resumeList = resumes?.data ?? (Array.isArray(resumes) ? resumes : []);

  if (!Array.isArray(resumeList) || resumeList.length === 0) {
    throw new ValidationError('No available resume found for Wanted application', {
      platform: WANTED_PLATFORM,
    });
  }

  const defaultResume = resumeList.find((resume) => resume.is_default) || resumeList[0];
  const resumeKey =
    defaultResume?.key ??
    defaultResume?.id ??
    defaultResume?.resume_id ??
    defaultResume?.uuid ??
    null;

  if (!resumeKey) {
    throw new ValidationError('Unable to resolve resume_key from Wanted profile', {
      platform: WANTED_PLATFORM,
    });
  }

  return resumeKey;
}
