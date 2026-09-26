import { isLoggedIn, getDiagnostics } from './auth-checker.js';
import { isTransientPageError, sleep, withTimeout } from './page-utils.js';
import {
  buildCaptchaInstructions,
  detectCaptcha,
  waitForManualCaptchaSolve,
} from './captcha-handler.js';

/**
 * @param {import('puppeteer').Page & { context?: () => { cookies: () => Promise<Array<{ name: string, value: string }>> } }} page
 * @returns {Promise<string>}
 */
async function buildCookieHeaderFromContext(page) {
  /** @type {Array<{ name: string, value: string }>} */
  let cookies = [];
  try {
    if (
      page.browser &&
      typeof page.browser === 'function' &&
      page.browser().defaultBrowserContext
    ) {
      cookies = await page.browser().defaultBrowserContext().cookies();
    } else if (page.context && typeof page.context === 'function') {
      cookies = await page.context().cookies();
    }
  } catch (_e) {
    // ignore browser-context cookie extraction errors
  }
  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
}

/**
 * @typedef {Object} LoginConfirmationOptions
 * @property {(params: { cookieString: string, resumeUrl: string, userAgent: string }) => Promise<unknown>} verifyAuthenticatedSession
 * @property {string} resumeUrl
 * @property {string} userAgent
 * @property {string} [headlessEnv]
 * @property {(msg: string) => void} log
 */

/**
 * @param {import('puppeteer').Page & import('playwright').Page} page
 * @param {LoginConfirmationOptions} options
 * @returns {Promise<boolean>}
 */
export async function waitForLoginConfirmation(
  page,
  { verifyAuthenticatedSession, resumeUrl, userAgent, headlessEnv, log }
) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30000) {
    const loggedIn = await withTimeout(
      isLoggedIn(page).catch((error) => {
        if (isTransientPageError(error)) {
          return false;
        }

        throw error;
      }),
      3000,
      false
    );
    if (loggedIn) {
      return true;
    }

    const captchaDetected = await withTimeout(
      detectCaptcha(page).catch((error) => {
        if (isTransientPageError(error)) {
          return false;
        }

        throw error;
      }),
      3000,
      false
    );

    if (captchaDetected) {
      if (headlessEnv === 'true') {
        throw new Error(buildCaptchaInstructions());
      }

      await waitForManualCaptchaSolve(page, { log });
      return true;
    }

    const cookieString = await withTimeout(
      buildCookieHeaderFromContext(page).catch(() => ''),
      5000,
      ''
    );
    if (cookieString) {
      try {
        await verifyAuthenticatedSession({ cookieString, resumeUrl, userAgent });
        return true;
      } catch {
        // Keep polling until timeout.
      }
    }

    await sleep(2000);
  }

  const diagnostics = await getDiagnostics(page);
  throw new Error(
    `Login sentinel not found within 30s (url=${diagnostics.url}, title=${diagnostics.title}, logout=${diagnostics.hasLogoutLink}, userLink=${diagnostics.hasUserLink}, loginForm=${diagnostics.hasLoginForm}, bodySnippet=${JSON.stringify(diagnostics.bodySnippet)})`
  );
}
