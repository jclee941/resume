import { BrowserService } from '@resume/shared/browser/service';
import { hydrateSessionCookies } from './browser-rendering-cookies.js';
import { clickControl, inspectApplicationPage, settlePage } from './browser-rendering-page.js';
import {
  completedResult,
  detectCompletion,
  findApplyControl,
  findConfirmControl,
  renderedReviewResult,
} from './browser-rendering-results.js';

/**
 * @typedef {{
 *   BrowserService?: typeof BrowserService;
 * }} BrowserDependencies
 */

/**
 * @typedef {{
 *   platform: string;
 *   sourceUrl?: string;
 *   job?: { sourceUrl?: string };
 *   jobId?: string | number;
 *   resume?: unknown;
 *   coverLetter?: string;
 * }} BrowserSubmitParams
 */

/**
 * @typedef {import('./browser-rendering-page.js').PageWithClick & {
 *   title?: () => Promise<string>;
 *   url?: () => string;
 *   close?: () => Promise<unknown>;
 *   goto: (url: string, options?: { waitUntil?: string; timeout?: number }) => Promise<import('./browser-rendering-results.js').ResponseLike | null>;
 *   evaluate: (fn: (selector: string) => { bodyText: string; controls: import('./browser-rendering-page.js').PageControl[] }, arg: string) => Promise<{ bodyText: string; controls: import('./browser-rendering-page.js').PageControl[] }>;
 * }} RenderedSubmitPage
 */

const BROWSER_CONFIG = {
  pageTimeoutMs: 20_000,
  acceptLanguage: 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
};

/** @type {Record<string, string>} */
const PLATFORM_URL_HOSTS = {
  jobkorea: 'jobkorea.co.kr',
  saramin: 'saramin.co.kr',
};

/**
 * @typedef {{
 *   env: {
 *     MYBROWSER?: import('@cloudflare/puppeteer').BrowserWorker;
 *     SESSIONS?: { get: Function };
 *     ENCRYPTION_KEY?: string;
 *     [key: string]: unknown;
 *   };
 *   [key: string]: unknown;
 * }} BrowserSubmitContext
 */

/**
 * @param {BrowserSubmitContext} ctx
 * @param {BrowserSubmitParams} params
 * @param {BrowserDependencies} [dependencies]
 * @returns {Promise<import('./application-submitters.js').SubmitResult>}
 */
export async function submitWithBrowserRendering(ctx, params, dependencies = {}) {
  const platform = params.platform;
  const targetUrl = createApplicationUrl(
    platform,
    params.sourceUrl || params.job?.sourceUrl || params.jobId
  );

  if (!ctx?.env?.MYBROWSER) {
    return browserRenderingRequired(platform, targetUrl, 'MYBROWSER binding is not available');
  }
  if (!targetUrl) {
    return browserRenderingRequired(platform, null, 'Application URL could not be resolved');
  }

  const Service = dependencies.BrowserService ?? BrowserService;
  const browserService = new Service(
    /** @type {import('@resume/shared/browser/service').BrowserEnv} */ (ctx.env),
    BROWSER_CONFIG
  );
  const page = /** @type {RenderedSubmitPage} */ (await browserService.newPage());

  try {
    const cookieCount = await hydrateSessionCookies(ctx, page, platform, targetUrl);
    const response = await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: BROWSER_CONFIG.pageTimeoutMs,
    });
    await settlePage(page);

    const pageState = await inspectApplicationPage(page);
    return await submitFromRenderedPage(
      platform,
      targetUrl,
      page,
      response,
      cookieCount,
      pageState
    );
  } finally {
    await page.close?.().catch?.(() => {});
    await browserService.close?.();
  }
}

/**
 * @param {string} platform
 * @param {unknown} candidate
 * @returns {string | null}
 */
export function createApplicationUrl(platform, candidate) {
  if (!candidate) return null;
  const value = String(candidate);
  if (/^https?:\/\//i.test(value)) return normalizeAllowedApplicationUrl(platform, value);
  const id = value.match(/\d+/)?.[0];
  if (!id) return null;

  if (platform === 'jobkorea') {
    return `https://www.jobkorea.co.kr/Recruit/GI_Read/${id}`;
  }
  if (platform === 'saramin') {
    return `https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=${id}`;
  }
  return null;
}

/**
 * @param {string} platform
 * @param {string} value
 * @returns {string | null}
 */
function normalizeAllowedApplicationUrl(platform, value) {
  const allowedHost = PLATFORM_URL_HOSTS[platform];
  if (!allowedHost) return null;

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const allowed = hostname === allowedHost || hostname.endsWith(`.${allowedHost}`);
    return url.protocol === 'https:' && allowed ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} platform
 * @param {string} targetUrl
 * @param {RenderedSubmitPage} page
 * @param {import('./browser-rendering-results.js').ResponseLike | null} response
 * @param {number} cookieCount
 * @param {import('./browser-rendering-results.js').PageState & { bodyText?: string }} pageState
 * @returns {Promise<import('./application-submitters.js').SubmitResult>}
 */
async function submitFromRenderedPage(platform, targetUrl, page, response, cookieCount, pageState) {
  const title = /** @type {string} */ (await page.title?.());
  const finalUrl = typeof page.url === 'function' ? page.url() : targetUrl;
  const completion = detectCompletion(pageState.bodyText);

  if (completion.alreadyApplied) {
    return completedResult('already_applied', {
      success: true,
      alreadyApplied: true,
      platform,
      targetUrl,
      finalUrl,
      title,
      cookieCount,
      httpStatus: response?.status?.() ?? 0,
    });
  }

  const applyControl = findApplyControl(pageState);
  if (!applyControl) {
    return renderedReviewResult(
      platform,
      targetUrl,
      finalUrl,
      title,
      response,
      cookieCount,
      pageState
    );
  }

  const applyClicked = await clickControl(
    page,
    /** @type {{ selector?: string } | undefined} */ (applyControl)
  );
  if (!applyClicked) {
    return renderedReviewResult(
      platform,
      targetUrl,
      finalUrl,
      title,
      response,
      cookieCount,
      pageState
    );
  }

  const afterApply = await inspectApplicationPage(page);
  const afterApplyCompletion = detectCompletion(afterApply.bodyText);
  if (afterApplyCompletion.complete) {
    return completedResult(afterApplyCompletion.status, {
      platform,
      targetUrl,
      finalUrl: page.url?.() || finalUrl,
      title: await page.title?.(),
      cookieCount,
      httpStatus: response?.status?.() ?? 0,
    });
  }

  const confirmControl = findConfirmControl(afterApply);
  if (
    !confirmControl ||
    !(await clickControl(page, /** @type {{ selector?: string } | undefined} */ (confirmControl)))
  ) {
    return renderedReviewResult(
      platform,
      targetUrl,
      page.url?.() || finalUrl,
      title,
      response,
      cookieCount,
      {
        ...afterApply,
        visibleAction: applyControl.text,
        networkWrite: true,
      }
    );
  }

  const finalState = await inspectApplicationPage(page);
  const finalCompletion = detectCompletion(finalState.bodyText);
  if (finalCompletion.complete) {
    return completedResult(finalCompletion.status, {
      platform,
      targetUrl,
      finalUrl: page.url?.() || finalUrl,
      title: await page.title?.(),
      cookieCount,
      httpStatus: response?.status?.() ?? 0,
    });
  }

  return renderedReviewResult(
    platform,
    targetUrl,
    page.url?.() || finalUrl,
    title,
    response,
    cookieCount,
    {
      ...finalState,
      visibleAction: confirmControl.text,
      networkWrite: true,
    }
  );
}

/**
 * @param {string} platform
 * @param {string | null} targetUrl
 * @param {string} reason
 * @returns {import('./application-submitters.js').SubmitResult}
 */
function browserRenderingRequired(platform, targetUrl, reason) {
  return {
    success: false,
    error: reason,
    platform,
    targetUrl,
    browserRendered: false,
    requiresBrowserRendering: true,
    requiresBrowserRenderingBinding: reason.includes('MYBROWSER'),
    requiresJobServer: false,
    requiresBrowserAutomation: false,
    networkWrite: false,
  };
}
