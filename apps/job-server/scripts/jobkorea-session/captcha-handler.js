import { isLoggedIn } from './auth-checker.js';
import { evaluateWithFallback, getActivePage, sleep } from './page-utils.js';

const MANUAL_RENEW_COMMAND =
  'HEADLESS=false node apps/job-server/scripts/renew-jobkorea-session.js';
const MANUAL_TIMEOUT_MS = 120000;
const MANUAL_PROGRESS_INTERVAL_MS = 10000;

/**
 * @returns {string}
 */
export function buildCaptchaInstructions() {
  return (
    'CAPTCHA/2FA required; it is not solved automatically. ' +
    `Run manual renewal with: ${MANUAL_RENEW_COMMAND}. ` +
    'Complete the JobKorea CAPTCHA/2FA challenge in the opened browser window, then let the script save cookies.'
  );
}

/**
 * @param {import('puppeteer').Page} page
 * @param {{ log: (msg: string) => void }} options
 */
export async function waitForManualCaptchaSolve(page, { log }) {
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

/**
 * @param {import('puppeteer').Page} page
 */
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

/**
 * @param {import('puppeteer').Page & import('playwright').Page} page
 * @param {{ log: (msg: string) => void, headlessEnv?: string }} options
 */
export async function handleCaptchaIfNeeded(page, { log, headlessEnv }) {
  const captchaDetected = await detectCaptcha(page);
  if (!captchaDetected) {
    return false;
  }

  if (headlessEnv === 'true') {
    throw new Error(buildCaptchaInstructions());
  }

  await waitForManualCaptchaSolve(page, { log });
  return true;
}

export { waitForLoginConfirmation } from './login-confirmation.js';
