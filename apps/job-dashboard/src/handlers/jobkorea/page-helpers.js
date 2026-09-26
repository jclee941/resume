/**
 * @fileoverview Browser-page automation helpers for the JobKorea login flow:
 * form fill, visible-submit click, login/CAPTCHA detection, CAPTCHA image
 * download, and post-login cookie collection. Kept separate from
 * mint-session.js so that module can stay focused on orchestration + the
 * cliproxy vision call. Ported from
 * apps/job-server/scripts/jobkorea-session/{form-filler,captcha-handler,
 * auth-checker}.js and
 * apps/job-server/scripts/profile-sync/jobkorea-handler/captcha-image.js.
 * @module handlers/jobkorea/page-helpers
 */

const EMAIL_SELECTORS = [
  'input[name="M_ID"]',
  'input[type="email"]',
  'input[type="text"][id*="id" i]',
];
const PASSWORD_SELECTORS = ['input[name="M_PWD"]', 'input[type="password"]'];
export const SUBMIT_SELECTOR = 'button[type="submit"], input[type="submit"]';
export const CAPTCHA_SUBMIT_SELECTOR =
  'button[type="submit"], input[type="submit"], button, input[type="button"]';
const CAPTCHA_INPUT_SELECTOR =
  '#gtxt, input[name="gtxt"], input[id*="captcha" i], input[name*="captcha" i]';

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
 * @returns {Promise<string | null>}
 */
export async function findCaptchaImageUrl(page) {
  return page.evaluate(() => {
    const direct = /** @type {HTMLImageElement | null} */ (
      document.querySelector('img[src*="captcha"]')
    );
    if (direct?.src) return direct.src;
    const gtxt = document.querySelector('#gtxt, input[name="gtxt"]');
    const container = gtxt?.closest('div, td, li, p');
    const img = /** @type {HTMLImageElement | null | undefined} */ (
      container?.querySelector('img')
    );
    if (img?.src) return img.src;
    if (gtxt) return 'https://www.jobkorea.co.kr/login/captcha.asp';
    return null;
  });
}

/**
 * @param {import('@cloudflare/puppeteer').Page} page
 * @param {string} src
 * @returns {Promise<{ base64: string, mime: string }>}
 */
export async function downloadCaptchaImage(page, src) {
  return page.evaluate(
    /** @param {string} imageSrc */
    async (imageSrc) => {
      const res = await fetch(imageSrc, { credentials: 'include' });
      const blob = await res.blob();
      const dataUrl = /** @type {string} */ (
        await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(/** @type {string} */ (reader.result));
          reader.readAsDataURL(blob);
        })
      );
      const mimeMatch = dataUrl.match(/^data:([^;]+);/);
      return { base64: dataUrl.split(',')[1], mime: mimeMatch ? mimeMatch[1] : 'image/bmp' };
    },
    src
  );
}

/**
 * @param {import('@cloudflare/puppeteer').Page} page
 * @param {string} value
 * @returns {Promise<void>}
 */
export async function fillCaptchaInput(page, value) {
  const filled = await page.evaluate(
    /** @param {{ selector: string, value: string }} args */
    ({ selector, value: text }) => {
      const el = /** @type {HTMLInputElement | null} */ (document.querySelector(selector));
      if (!el) return false;
      el.focus();
      el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    },
    { selector: CAPTCHA_INPUT_SELECTOR, value }
  );
  if (!filled) throw new Error('JobKorea CAPTCHA input not found');
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
