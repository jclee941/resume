import { isLoggedIn, getDiagnostics } from './auth-checker.js';
import { solveJobKoreaCaptcha } from '../profile-sync/jobkorea-handler/captcha-solver.js';
import {
  evaluateWithFallback,
  getActivePage,
  isTransientPageError,
  sleep,
  withTimeout,
} from './page-utils.js';

const MANUAL_RENEW_COMMAND = 'HEADLESS=false node apps/job-server/scripts/renew-jobkorea-session.js';
const MANUAL_TIMEOUT_MS = 120000;
const MANUAL_PROGRESS_INTERVAL_MS = 10000;

function buildCaptchaInstructions(reason) {
  const reasonText = reason ? ` Automatic solve failed: ${reason}.` : '';
  return (
    `CAPTCHA/2FA required.${reasonText} ` +
    `Run manual renewal with: ${MANUAL_RENEW_COMMAND}. ` +
    'Complete the JobKorea CAPTCHA/2FA challenge in the opened browser window, then let the script save cookies.'
  );
}

async function resolveCaptchaInput(page) {
  const activePage = await getActivePage(page);
  for (const selector of [
    '#gtxt',
    'input[name="gtxt"]',
    'input[id*="captcha" i]',
    'input[name*="captcha" i]',
  ]) {
    const input = await activePage.$(selector);
    if (input) {
      return { activePage, input };
    }
  }

  return { activePage, input: null };
}

async function fillCaptchaInput(page, text) {
  const { activePage } = await resolveCaptchaInput(page);
  const hasInput = await activePage.evaluate(() => {
    return !!document.querySelector('#gtxt, input[name="gtxt"], input[id*="captcha" i], input[name*="captcha" i]');
  });
  if (!hasInput) {
    throw new Error('CAPTCHA input not found');
  }

  await activePage.evaluate((value) => {
    const el = document.querySelector('#gtxt, input[name="gtxt"], input[id*="captcha" i], input[name*="captcha" i]');
    if (el) {
      el.focus();
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, text);
}

async function clickCaptchaSubmit(page, { log }) {
  const activePage = await getActivePage(page);
  const candidates = await activePage.$$(
    'button[type="submit"], input[type="submit"], button, input[type="button"]'
  );
  for (const candidate of candidates) {
    const visible = await candidate.evaluate((element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity || '1') > 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    });

    if (visible) {
      await candidate.click();
      log('CAPTCHA submit clicked');
      return true;
    }
  }

  return false;
}

async function tryAutomaticCaptchaSolve(page, { log, submitAfterSolve = false }) {
  log('CAPTCHA/2FA detected, attempting automatic CAPTCHA solve');
  try {
    const result = await solveJobKoreaCaptcha(page);
    if (!result?.text) {
      return { solved: false, reason: 'vision solver returned no answer' };
    }

    await fillCaptchaInput(page, result.text);
    log(`CAPTCHA answer entered via ${result.model}`);
    if (submitAfterSolve) {
      await clickCaptchaSubmit(page, { log });
      await sleep(3000);
    }

    return { solved: true };
  } catch (error) {
    return { solved: false, reason: error.message };
  }
}

async function waitForManualCaptchaSolve(page, { log }) {
  log('CAPTCHA/2FA detected, waiting up to 120 seconds for manual completion');
  const startedAt = Date.now();
  let lastProgressAt = 0;
  while (Date.now() - startedAt < MANUAL_TIMEOUT_MS) {
    if (await isLoggedIn(page)) {
      log('Manual verification completed');
      return true;
    }

    const elapsed = Date.now() - startedAt;
    if (elapsed - lastProgressAt >= MANUAL_PROGRESS_INTERVAL_MS) {
      const remainingSeconds = Math.ceil((MANUAL_TIMEOUT_MS - elapsed) / 1000);
      log(`Waiting for manual CAPTCHA/2FA completion (${remainingSeconds}s remaining)`);
      lastProgressAt = elapsed;
    }

    await sleep(2000);
  }

  throw new Error('CAPTCHA/2FA required but was not completed within 120 seconds');
}

export async function detectCaptcha(page) {
  const activePage = await getActivePage(page);
  return evaluateWithFallback(activePage, (currentPage) => {
    return currentPage.evaluate(() => {
      const text = document.body?.innerText || '';
      const hasText =
        text.includes('보안인증') ||
        text.includes('reCAPTCHA') ||
        text.includes('자동가입 방지') ||
        text.includes('비정상적인 접근');
      const hasIframe = Array.from(document.querySelectorAll('iframe')).some((iframe) =>
        /captcha/i.test(iframe.getAttribute('src') || '')
      );
      const hasCaptchaInput = !!document.querySelector('#gtxt, input[name="gtxt"]');
      const hasCaptchaImage = !!document.querySelector('img[src*="captcha" i]');

      return hasText || hasIframe || hasCaptchaInput || hasCaptchaImage;
    });
  });
}

export async function handleCaptchaIfNeeded(page, { log, headlessEnv }) {
  const captchaDetected = await detectCaptcha(page);
  if (!captchaDetected) {
    return false;
  }

  const solveResult = await tryAutomaticCaptchaSolve(page, { log });
  if (solveResult.solved) {
    return true;
  }

  if (headlessEnv === 'true') {
    throw new Error(buildCaptchaInstructions(solveResult.reason));
  }

  log(`Automatic CAPTCHA solve failed: ${solveResult.reason}. Falling back to manual solve.`);
  await waitForManualCaptchaSolve(page, { log });
  return true;
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
      const solveResult = await tryAutomaticCaptchaSolve(page, { log, submitAfterSolve: true });
      if (solveResult.solved) {
        continue;
      }

      if (headlessEnv === 'true') {
        throw new Error(buildCaptchaInstructions(solveResult.reason));
      }

      log(`Automatic CAPTCHA solve failed: ${solveResult.reason}. Falling back to manual solve.`);
      await waitForManualCaptchaSolve(page, { log });
      return true;
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
  let cookies = [];
  try {
    if (page.browser && typeof page.browser === 'function' && page.browser().defaultBrowserContext) {
      cookies = await page.browser().defaultBrowserContext().cookies();
    } else if (page.context && typeof page.context === 'function') {
      cookies = await page.context().cookies();
    }
  } catch (e) {
    // ignore browser-context cookie extraction errors
  }
  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
}
