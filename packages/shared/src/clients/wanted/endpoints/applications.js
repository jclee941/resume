import { WantedAPIError } from '../http-client.js';

/**
 * @typedef {{
 *   id?: number | string;
 *   email?: string | null;
 *   username?: string | null;
 *   mobile?: string | null;
 *   nationality_code?: string | null;
 *   visa?: string | null;
 *   status?: number | string;
 *   status_text?: string;
 *   [key: string]: unknown;
 * }} WantedApplication
 *
 * @typedef {{
 *   alreadyApplied: boolean;
 *   applicationId: number | null;
 *   status: string | null;
 * }} WantedApplyResult
 */

const UNSUBMITTED_DRAFT_STATUS = 'write';

/**
 * Applies the way the wanted.co.kr position page does (reverse-engineered from its
 * bundle on 2026-10-02): opening the apply sheet posts a draft (`status: "write"`)
 * with the account's contact fields, and submitting posts the same endpoint again
 * with `status: "apply"` and the chosen resume keys.
 */
export class ApplicationsEndpoint {
  #client;

  /**
   * @param {import('../http-client.js').HttpClient} client
   */
  constructor(client) {
    this.#client = client;
  }

  /**
   * The signed-in account's application for a job, or null when it has none.
   * @param {string | number} jobId
   * @returns {Promise<WantedApplication | null>}
   */
  async findForJob(jobId) {
    const detail = await this.#client.request(`/jobs/${toWantedJobId(jobId)}`);
    return detail?.application ?? null;
  }

  /**
   * Submit an application with the profile resume unless a resume key is given.
   * A job that already has a submitted application is reported, never re-posted.
   * @param {string | number} jobId numeric id, bare or as `wanted-<id>`
   * @param {{ resumeKey?: string | null }} [options]
   * @returns {Promise<WantedApplyResult>}
   */
  async apply(jobId, { resumeKey = null } = {}) {
    const id = toWantedJobId(jobId);
    const existing = await this.findForJob(id);
    if (existing && existing.status_text !== UNSUBMITTED_DRAFT_STATUS) {
      return toResult(true, existing);
    }

    const me = await this.#client.request('/user');
    const key =
      resumeKey || (await this.#client.chaosRequest('/profiles/v1/resume'))?.data?.resume_key;
    if (!key) throw new WantedAPIError('Wanted profile resume has no resume_key');

    const headers = { Referer: `https://www.wanted.co.kr/wd/${id}` };
    /** @type {WantedApplication} */
    const draft = await this.#client.chaosRequest('/applications/v1', {
      method: 'POST',
      headers,
      body: {
        email: me?.email,
        job_id: id,
        username: me?.name,
        mobile: me?.mobile,
        resume_keys: [],
        status: UNSUBMITTED_DRAFT_STATUS,
      },
    });
    /** @type {WantedApplication} */
    const submitted = await this.#client.chaosRequest('/applications/v1', {
      method: 'POST',
      headers,
      body: {
        email: trimmed(draft?.email ?? me?.email),
        username: trimmed(draft?.username ?? me?.name),
        mobile: trimmed(draft?.mobile ?? me?.mobile),
        resume_keys: [key],
        job_id: id,
        nationality_code: draft?.nationality_code,
        visa: draft?.visa,
        status: 'apply',
      },
    });
    return toResult(false, submitted);
  }
}

/**
 * @param {string | number} jobId
 * @returns {number}
 */
function toWantedJobId(jobId) {
  const id = Number(String(jobId).replace(/^wanted-/, ''));
  if (!Number.isInteger(id) || id <= 0) throw new WantedAPIError(`Invalid Wanted job id: ${jobId}`);
  return id;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function trimmed(value) {
  return value == null ? '' : String(value).trim();
}

/**
 * @param {boolean} alreadyApplied
 * @param {WantedApplication | null | undefined} application
 * @returns {WantedApplyResult}
 */
function toResult(alreadyApplied, application) {
  const id = Number(application?.id);
  const status = application?.status_text ?? application?.status;
  return {
    alreadyApplied,
    applicationId: Number.isFinite(id) ? id : null,
    status: status == null ? null : String(status),
  };
}
