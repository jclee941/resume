import { submitToAtsDryRunOnly } from './application-platform-catalog.js';
import { submitWithBrowserRendering } from './browser-rendering-submit.js';
import { submitJobKoreaApplication } from './jobkorea-submit.js';
import { submitRememberApplication } from './remember-submit.js';
import { submitWantedApplication } from './wanted-submit.js';

/**
 * @typedef {{
 *   id?: string;
 *   [key: string]: unknown;
 * }} SubmitResume
 *
 * @typedef {{
 *   env: Record<string, unknown> & {
 *     MYBROWSER?: import('@cloudflare/puppeteer').BrowserWorker;
 *     SESSIONS: { get: Function; put: Function };
 *     ENCRYPTION_KEY?: string;
 *   } & import('./jobkorea-submit.js').JobKoreaSubmitEnv;
 * }} SubmitContext
 *
 * @typedef {{
 *   success: boolean;
 *   error?: string | null;
 *   platform?: string;
 *   platformResponse?: unknown;
 *   requiresBrowserAutomation?: boolean;
 *   [key: string]: unknown;
 * }} SubmitResult
 *
 * @typedef {{
 *   sourceUrl?: string;
 *   job?: Record<string, unknown>;
 *   preview?: boolean;
 * }} SubmitterOptions
 *
 * @typedef {{
 *   platform: string;
 *   jobId: string;
 *   sourceUrl?: string;
 *   resume?: SubmitResume | null;
 *   coverLetter?: string;
 *   job?: Record<string, unknown>;
 *   preview?: boolean;
 * }} SubmitApplicationParams
 */

/**
 * @param {SubmitContext} ctx
 * @param {SubmitApplicationParams} params
 * @returns {Promise<SubmitResult>}
 */
export async function submitApplication(
  ctx,
  { platform, jobId, sourceUrl, resume, coverLetter, job, preview }
) {
  /** @type {Record<string, () => Promise<SubmitResult> | SubmitResult>} */
  const submitters = {
    wanted: () => submitToWanted(ctx, jobId, resume, coverLetter),
    linkedin: () => submitToLinkedIn(ctx, jobId, resume, coverLetter),
    remember: () => submitToRemember(ctx, jobId, resume, coverLetter),
    jobkorea: () => submitToJobKorea(ctx, jobId, resume, coverLetter, { preview }),
    saramin: () => submitToSaramin(ctx, jobId, resume, coverLetter, { sourceUrl, job }),
    greenhouse: () => submitToAtsDryRunOnly('greenhouse'),
    lever: () => submitToAtsDryRunOnly('lever'),
    ashby: () => submitToAtsDryRunOnly('ashby'),
  };
  const submitter = submitters[platform];
  if (!submitter) {
    return { success: false, error: `Unknown platform: ${platform}` };
  }
  try {
    return await submitter();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Wanted's apply attaches the account's profile resume and takes no cover letter.
 * @param {SubmitContext} ctx
 * @param {string} jobId
 * @param {SubmitResume | null | undefined} _resume
 * @param {string} [_coverLetter]
 * @returns {Promise<SubmitResult>}
 */
export async function submitToWanted(ctx, jobId, _resume, _coverLetter) {
  return submitWantedApplication(ctx.env, jobId);
}

/**
 * @param {SubmitContext} _ctx
 * @param {string} _jobId
 * @param {SubmitResume | null | undefined} _resume
 * @param {string} [_coverLetter]
 * @returns {Promise<SubmitResult>}
 */
export async function submitToLinkedIn(_ctx, _jobId, _resume, _coverLetter) {
  return browserAutomationRequired('linkedin', 'LinkedIn Easy Apply');
}

/**
 * Remember applies with the open profile, so the resume and cover letter are not sent.
 * @param {SubmitContext} ctx
 * @param {string} jobId
 * @param {SubmitResume | null | undefined} _resume
 * @param {string} [_coverLetter]
 * @returns {Promise<SubmitResult>}
 */
export async function submitToRemember(ctx, jobId, _resume, _coverLetter) {
  return submitRememberApplication(ctx.env, jobId);
}

/**
 * JobKorea 즉시지원 sends the account's stored resume, so the resume and cover letter are not sent.
 * `preview` stops at the OnPass popup without applying.
 * @param {SubmitContext} ctx
 * @param {string} jobId
 * @param {SubmitResume | null | undefined} _resume
 * @param {string} [_coverLetter]
 * @param {SubmitterOptions} [options]
 * @returns {Promise<SubmitResult>}
 */
export async function submitToJobKorea(ctx, jobId, _resume, _coverLetter, options = {}) {
  return submitJobKoreaApplication(ctx.env, jobId, { preview: options.preview === true });
}

/**
 * @param {SubmitContext} ctx
 * @param {string} jobId
 * @param {SubmitResume | null | undefined} resume
 * @param {string} [coverLetter]
 * @param {SubmitterOptions} [options]
 * @returns {Promise<SubmitResult>}
 */
export async function submitToSaramin(ctx, jobId, resume, coverLetter, options = {}) {
  return submitWithBrowserRendering(ctx, {
    platform: 'saramin',
    jobId,
    sourceUrl: options.sourceUrl,
    resume,
    coverLetter,
    job: options.job,
  });
}

/**
 * @param {string} platform
 * @param {string} label
 * @returns {SubmitResult}
 */
function browserAutomationRequired(platform, label) {
  return {
    success: false,
    error: `${label} requires browser automation; the workflow recorded a handoff instead of submitting.`,
    platform,
    requiresBrowserAutomation: true,
  };
}
