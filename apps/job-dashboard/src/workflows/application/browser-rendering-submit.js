import { BrowserService } from '@resume/shared/browser/service';
import { clickControl, inspectApplicationPage, settlePage } from './browser-rendering-page.js';
import {
  completedResult,
  detectCompletion,
  findApplyControl,
  findConfirmControl,
  renderedReviewResult,
} from './browser-rendering-results.js';
const BROWSER_CONFIG = {
  pageTimeoutMs: 20_000,
  acceptLanguage: 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
};
const PLATFORM_URL_HOSTS = {
  jobkorea: 'jobkorea.co.kr',
  saramin: 'saramin.co.kr',
};

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
  const browserService = new Service(ctx.env, BROWSER_CONFIG);
  const page = await browserService.newPage();

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

async function hydrateSessionCookies(ctx, page, platform, targetUrl) {
  const cookieHeader = await getPlatformCookieHeader(ctx, platform);
  const cookies = parseCookieHeader(cookieHeader, targetUrl);
  if (cookies.length === 0 || typeof page.setCookie !== 'function') return 0;
  await page.setCookie(...cookies);
  return cookies.length;
}

async function getPlatformCookieHeader(ctx, platform) {
  const raw = await ctx?.env?.SESSIONS?.get?.(`auth:${platform}`);
  if (!raw) return '';
  if (typeof raw !== 'string') return cookiesToHeader(raw.cookies);

  const trimmed = raw.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return raw;

  try {
    const parsed = JSON.parse(trimmed);
    return parsed.cookieHeader || parsed.cookie || cookiesToHeader(parsed.cookies) || '';
  } catch {
    return raw;
  }
}

function cookiesToHeader(cookies) {
  if (!Array.isArray(cookies)) return '';
  return cookies
    .filter((cookie) => cookie?.name && cookie?.value != null)
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');
}

function parseCookieHeader(cookieHeader, targetUrl) {
  if (!cookieHeader) return [];
  const { hostname } = new URL(targetUrl);
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator = part.indexOf('=');
      if (separator <= 0) return null;
      return {
        name: part.slice(0, separator).trim(),
        value: part.slice(separator + 1).trim(),
        domain: hostname,
        path: '/',
        secure: true,
      };
    })
    .filter(Boolean);
}

async function submitFromRenderedPage(platform, targetUrl, page, response, cookieCount, pageState) {
  const title = await page.title?.();
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

  const applyClicked = await clickControl(page, applyControl);
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
  if (!confirmControl || !(await clickControl(page, confirmControl))) {
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
