import { sleep } from './page-utils.js';

/**
 * @typedef {{
 *   click(options?: { clickCount?: number, count?: number }): Promise<void>,
 *   type(text: string, options?: { delay?: number }): Promise<void>
 * }} InputElementHandle
 */

/**
 * @param {import('puppeteer').Page} page
 * @param {string[]} selectors
 * @returns {Promise<InputElementHandle | null>}
 */
export async function resolveInput(page, selectors) {
  for (const selector of selectors) {
    const input = await page.$(selector);
    if (input) {
      return /** @type {InputElementHandle} */ (input);
    }
  }

  return null;
}

/**
 * @typedef {{
 *   email: string,
 *   password: string,
 *   log: (msg: string) => void
 * }} LoginCredentials
 */

/**
 * @param {import('puppeteer').Page} page
 * @param {LoginCredentials} param1
 * @returns {Promise<void>}
 */
export async function fillLoginForm(page, { email, password, log }) {
  const emailInput = await resolveInput(page, [
    'input[name="M_ID"]',
    'input[type="email"]',
    'input[type="text"][id*="id" i]',
  ]);
  if (!emailInput) {
    throw new Error('JobKorea email input not found');
  }

  await emailInput.click({ clickCount: 3 });
  await emailInput.type(email, { delay: 35 });
  log('Email entered');
  await sleep(500);

  const passwordInput = await resolveInput(page, ['input[name="M_PWD"]', 'input[type="password"]']);
  if (!passwordInput) {
    throw new Error('JobKorea password input not found');
  }

  await passwordInput.click({ clickCount: 3 });
  await passwordInput.type(password, { delay: 35 });
  log('Password entered');
  await sleep(500);
}

/**
 * @param {import('puppeteer').Page} page
 * @param {{ log: (msg: string) => void }} param1
 * @returns {Promise<void>}
 */
export async function clickVisibleSubmit(page, { log }) {
  const candidates = await page.$$('button[type="submit"], input[type="submit"]');
  for (const candidate of candidates) {
    const visible = await candidate.evaluate((/** @type {Element} */ element) => {
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
      // Gracefully handle the page transition caused by the form POST.
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
        candidate.click(),
      ]);
      log('Submit clicked');
      await sleep(3000);
      return;
    }
  }

  throw new Error('Visible submit button not found');
}
