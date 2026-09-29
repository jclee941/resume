import { DEFAULT_USER_AGENT } from '@resume/shared/ua';
import { readPlatformSession } from '../../services/platform-session.js';
import { submitToAtsDryRunOnly } from './application-platform-catalog.js';
import { submitWithBrowserRendering } from './browser-rendering-submit.js';

/**
 * @typedef {{
 *   id?: string;
 *   [key: string]: unknown;
 * }} SubmitResume
 *
 * @typedef {{
 *   env: Record<string, unknown> & {
 *     MYBROWSER?: import('@cloudflare/puppeteer').BrowserWorker;
 *     SESSIONS?: { get: Function };
 *     ENCRYPTION_KEY?: string;
 *   };
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
 * }} SubmitterOptions
 *
 * @typedef {{
 *   platform: string;
 *   jobId: string;
 *   sourceUrl?: string;
 *   resume?: SubmitResume | null;
 *   coverLetter?: string;
 *   job?: Record<string, unknown>;
 * }} SubmitApplicationParams
 */

/**
 * @param {SubmitContext} ctx
 * @param {SubmitApplicationParams} params
 * @returns {Promise<SubmitResult>}
 */
export async function submitApplication(
  ctx,
  { platform, jobId, sourceUrl, resume, coverLetter, job }
) {
  /** @type {Record<string, () => Promise<SubmitResult> | SubmitResult>} */
  const submitters = {
    wanted: () => submitToWanted(ctx, jobId, resume, coverLetter),
    linkedin: () => submitToLinkedIn(ctx, jobId, resume, coverLetter),
    remember: () => submitToRemember(ctx, jobId, resume, coverLetter),
    jobkorea: () => submitToJobKorea(ctx, jobId, resume, coverLetter, { sourceUrl, job }),
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
 * @param {SubmitContext} ctx
 * @param {string} jobId
 * @param {SubmitResume | null | undefined} resume
 * @param {string} [coverLetter]
 * @returns {Promise<SubmitResult>}
 */
export async function submitToWanted(ctx, jobId, resume, coverLetter) {
  const session = await readPlatformSession(ctx.env, 'wanted');
  if (!session) return { success: false, error: 'No Wanted session' };
  const response = await fetch(
    `https://www.wanted.co.kr/api/v4/jobs/${jobId.replace('wanted-', '')}/apply`,
    {
      method: 'POST',
      headers: {
        Cookie: session,
        'Content-Type': 'application/json',
        'User-Agent': DEFAULT_USER_AGENT,
      },
      body: JSON.stringify({ resume_id: resume?.id, cover_letter: coverLetter }),
    }
  );
  if (!response.ok) {
    const error = await response.text();
    return { success: false, error: `Wanted API error: ${response.status} - ${error}` };
  }
  return { success: true, platformResponse: await response.json() };
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
 * @param {SubmitContext} _ctx
 * @param {string} _jobId
 * @param {SubmitResume | null | undefined} _resume
 * @param {string} [_coverLetter]
 * @returns {Promise<SubmitResult>}
 */
export async function submitToRemember(_ctx, _jobId, _resume, _coverLetter) {
  return browserAutomationRequired('remember', 'Remember application');
}

/**
 * @param {SubmitContext} ctx
 * @param {string} jobId
 * @param {SubmitResume | null | undefined} resume
 * @param {string} [coverLetter]
 * @param {SubmitterOptions} [options]
 * @returns {Promise<SubmitResult>}
 */
export async function submitToJobKorea(ctx, jobId, resume, coverLetter, options = {}) {
  return submitWithBrowserRendering(ctx, {
    platform: 'jobkorea',
    jobId,
    sourceUrl: options.sourceUrl,
    resume,
    coverLetter,
    job: options.job,
  });
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
