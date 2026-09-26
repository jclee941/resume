import { isLoggedIn, getDiagnostics } from './auth-checker.js';
import { isCliproxyConfigured } from '../profile-sync/jobkorea-handler/captcha-solver.js';
import { isTransientPageError, sleep, withTimeout } from './page-utils.js';
import {
  buildCaptchaInstructions,
  detectCaptcha,
  tryAutomaticCaptchaSolve,
  waitForManualCaptchaSolve,
} from './captcha-handler.js';

async function buildCookieHeaderFromContext(page) {
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
      const solveResult = await tryAutomaticCaptchaSolve(page, { log, submitAfterSolve: true });
      if (solveResult.solved) {
        continue;
      }

      if (headlessEnv === 'true') {
        if (!isCliproxyConfigured()) {
          throw new Error(
            'CAPTCHA/2FA detected but CLIPROXY_BASE is not configured. ' +
              'Set CLIPROXY_BASE and CLIPROXY_API_KEY environment variables to enable automatic CAPTCHA solving, ' +
              'or run with HEADLESS=false to solve manually in a browser window.'
          );
        }
        throw new Error(buildCaptchaInstructions(solveResult.reason));
      }

      log(`Automatic CAPTCHA solve failed: ${solveResult.reason}. Falling back to manual solve.`);
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
