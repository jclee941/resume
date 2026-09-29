/**
 * @fileoverview Browser-page automation helpers for the JobKorea login flow:
 * form fill, visible-submit click, login/CAPTCHA detection, and post-login
 * cookie collection. Kept separate from mint-session.js so that module can
 * stay focused on login orchestration.
 * @module handlers/jobkorea/page-helpers
 */

const EMAIL_SELECTORS = [
  'input[name="M_ID"]',
  'input[type="email"]',
  'input[type="text"][id*="id" i]',
];
const PASSWORD_SELECTORS = ['input[name="M_PWD"]', 'input[type="password"]'];
export const SUBMIT_SELECTOR = 'button[type="submit"], input[type="submit"]';

/**
 * @param {import('@cloudflare/puppeteer').Page} page
 * @param {string[]} selectors
 * @returns {Promise<import('@cloudflare/puppeteer').ElementHandle<Element> | null>}
 */
async function resolveInput(page, selectors) {
  for (const selector of selectors) {
    const input = await page.$(selector);
    if (input) return input;
  }
  return null;
}

/**
 * @param {import('@cloudflare/puppeteer').Page} page
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<void>}
 */
export async function fillLoginForm(page, { email, password }) {
  const emailInput = await resolveInput(page, EMAIL_SELECTORS);
  if (!emailInput) throw new Error('JobKorea email input not found');
  await emailInput.click({ clickCount: 3 });
  await emailInput.type(email, { delay: 35 });

  const passwordInput = await resolveInput(page, PASSWORD_SELECTORS);
  if (!passwordInput) throw new Error('JobKorea password input not found');
  await passwordInput.click({ clickCount: 3 });
  await passwordInput.type(password, { delay: 35 });
}

/**
 * @param {import('@cloudflare/puppeteer').ElementHandle<Element>} candidate
 * @returns {Promise<boolean>}
 */
async function isVisible(candidate) {
  return candidate.evaluate((element) => {
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
}

/**
 * @param {import('@cloudflare/puppeteer').Page} page
 * @param {string} selector
 * @param {{ required?: boolean }} [options]
 * @returns {Promise<boolean>}
 */
export async function clickVisibleSubmit(page, selector, { required = true } = {}) {
  const candidates = await page.$$(selector);
  for (const candidate of candidates) {
    if (await isVisible(candidate)) {
      await candidate.click();
      return true;
    }
  }
  if (required) throw new Error('Visible submit button not found');
  return false;
}

/**
 * @param {import('@cloudflare/puppeteer').Page} page
 * @param {string} selector
 * @param {{ required?: boolean }} [opts]
 * @returns {Promise<void>}
 */
export async function submitAndWait(page, selector, opts) {
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
    clickVisibleSubmit(page, selector, opts),
  ]);
}

const TRANSIENT_PAGE_ERROR =
  /Execution context was destroyed|Target closed|Cannot find context|detached Frame|Session closed|because of a navigation|frame got detached|Navigation timeout/i;

/**
 * @param {unknown} err
 * @returns {boolean}
 */
function isTransientPageError(err) {
  return TRANSIENT_PAGE_ERROR.test(/** @type {{ message?: string }} */ (err)?.message || '');
}

/**
 * @template T
 * @param {import('@cloudflare/puppeteer').Page} page
 * @param {() => T} fn
 * @param {T} fallback
 * @returns {Promise<T>}
 */
async function safeEvaluate(page, fn, fallback) {
  try {
    return await page.evaluate(fn);
  } catch (err) {
    if (isTransientPageError(err)) return fallback;
    throw err;
  }
}

/**
 * @param {import('@cloudflare/puppeteer').Page} page
 * @returns {Promise<boolean>}
 */
export async function isLoggedIn(page) {
  return safeEvaluate(
    page,
    () => {
      const logoutLink = document.querySelector('a[href*="/Login/Logout"]');
      const userLink = document.querySelector(
        'header a[href*="/User/"], #header a[href*="/User/"], a[href*="/User/"]'
      );
      return Boolean(logoutLink || userLink);
    },
    false
  );
}

/**
 * @param {import('@cloudflare/puppeteer').Page} page
 * @returns {Promise<boolean>}
 */
export async function detectCaptcha(page) {
  return safeEvaluate(
    page,
    () => {
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
    },
    false
  );
}

/**
 * @param {import('@cloudflare/puppeteer').Page} page
 * @param {import('@cloudflare/puppeteer').Browser | { defaultBrowserContext?(): { cookies(): Promise<import('@cloudflare/puppeteer').Cookie[]> } }} [browser]
 * @returns {Promise<string>}
 */
export async function collectJobKoreaCookies(page, browser) {
  /** @type {Array<import('@cloudflare/puppeteer').Cookie>} */
  let cookies;
  try {
    cookies = (await page.cookies()) || [];
  } catch {
    cookies = [];
  }
  if (cookies.length === 0 && typeof browser?.defaultBrowserContext === 'function') {
    try {
      cookies =
        (await /** @type {{ cookies(): Promise<import('@cloudflare/puppeteer').Cookie[]> }} */ (
          browser.defaultBrowserContext()
        ).cookies()) || [];
    } catch {
      cookies = [];
    }
  }
  return cookies
    .filter((cookie) => (cookie?.domain || '').includes('jobkorea'))
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');
}
