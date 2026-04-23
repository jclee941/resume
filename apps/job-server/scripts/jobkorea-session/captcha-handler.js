import { isLoggedIn, getDiagnostics } from './auth-checker.js';
import {
  evaluateWithFallback,
  getActivePage,
  isTransientPageError,
  sleep,
  withTimeout,
} from './page-utils.js';

export async function detectCaptcha(page) {
  const activePage = await getActivePage(page);
  return evaluateWithFallback(activePage, (currentPage) => {
    return currentPage.evaluate(() => {
      const text = document.body?.innerText || '';
      const hasText = text.includes('보안인증') || text.includes('reCAPTCHA');
      const hasIframe = Array.from(document.querySelectorAll('iframe')).some((iframe) =>
        /captcha/i.test(iframe.getAttribute('src') || '')
      );

      return hasText || hasIframe;
    });
  });
}

export async function handleCaptchaIfNeeded(page, { log, headlessEnv }) {
  const captchaDetected = await detectCaptcha(page);
  if (!captchaDetected) {
    return false;
  }

  if (headlessEnv === 'true') {
    throw new Error('CAPTCHA/2FA required — re-run with HEADLESS=false for manual solve');
  }

  log('CAPTCHA/2FA detected, waiting up to 120 seconds for manual completion');
  const startedAt = Date.now();
  while (Date.now() - startedAt < 120000) {
    if (await isLoggedIn(page)) {
      log('Manual verification completed');
      return true;
    }

    await sleep(2000);
  }

  throw new Error('CAPTCHA/2FA required but was not completed within 120 seconds');
}

export async function waitForLoginConfirmation(page, { verifyAuthenticatedSession, resumeUrl, userAgent, headlessEnv, log }) {
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
        throw new Error('CAPTCHA/2FA required — re-run with HEADLESS=false for manual solve');
      }

      log('CAPTCHA/2FA detected, waiting up to 120 seconds for manual completion');
      const manualStartedAt = Date.now();
      while (Date.now() - manualStartedAt < 120000) {
        const manuallyLoggedIn = await withTimeout(isLoggedIn(page).catch(() => false), 3000, false);
        if (manuallyLoggedIn) {
          return true;
        }

        await sleep(2000);
      }

      throw new Error('CAPTCHA/2FA required but was not completed within 120 seconds');
    }

    const cookieString = await withTimeout(buildCookieHeaderFromContext(page).catch(() => ''), 5000, '');
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

async function buildCookieHeaderFromContext(page) {
  const cookies = await page.browser().defaultBrowserContext().cookies();
  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
}
