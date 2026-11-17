/**
 * @fileoverview Page steps of a JobKorea 즉시지원 application, observed with a real browser
 * (2026-10-03/08): the logged-in posting page (/Recruit/GI_Read/<GI_No>) shows a 즉시지원 button,
 * which opens the /Recruit/OnPass popup whose 지원하기 button sends the application; JobKorea then
 * answers 지원완료 되었습니다. Every wait is bounded so a stalled page fails fast.
 * @module workflows/application/jobkorea-apply-page
 */

export const ONPASS_PATH = '/Recruit/OnPass';
export const STEP_TIMEOUT_MS = 20_000;
const POLL_INTERVAL_MS = 500;
const CONTROL_SELECTOR = 'a,button,input[type="button"],input[type="submit"]';

export const IMMEDIATE_APPLY_TEXT = /즉시\s*지원/;
export const ALREADY_APPLIED_TEXT = /지원\s*완료|이미\s*지원/;
export const SUBMIT_TEXT = /^지원\s*하기$/;
export const SUBMITTED_TEXT = /지원\s*완료\s*되었습니다|지원이\s*완료/;
/** Postings that need more than the stored resume (company form, screening questions). */
export const CUSTOM_FORM_TEXT = /자사\s*양식|사전\s*질문|질문에\s*답변|지원서\s*양식\s*다운로드/;

/**
 * @typedef {import('@cloudflare/puppeteer').Page} ApplyPage
 * @typedef {ApplyPage | import('@cloudflare/puppeteer').Frame} ApplyFrame
 */

/**
 * Marks the first visible control whose text matches `source` and returns its selector.
 * @param {ApplyFrame} page
 * @param {RegExp} pattern
 * @returns {Promise<{ selector: string; text: string } | null>}
 */
export async function findControl(page, pattern) {
  return page.evaluate(
    ({ selector, source, flags }) => {
      const matcher = new RegExp(source, flags);
      const nodes = /** @type {NodeListOf<HTMLElement & { value?: string }>} */ (
        document.querySelectorAll(selector)
      );
      for (const [index, node] of nodes.entries()) {
        const text = (node.innerText || node.value || node.textContent || '')
          .replace(/\s+/g, ' ')
          .trim();
        const rect = node.getBoundingClientRect();
        if (!matcher.test(text) || rect.width === 0 || rect.height === 0) continue;
        node.setAttribute('data-jk-apply', String(index));
        return { selector: `[data-jk-apply="${index}"]`, text };
      }
      return null;
    },
    { selector: CONTROL_SELECTOR, source: pattern.source, flags: pattern.flags }
  );
}

/**
 * @param {ApplyFrame} page
 * @returns {Promise<string>} the visible text, whitespace collapsed
 */
export async function bodyText(page) {
  return page.evaluate(
    () => (document.body?.innerText || '').replace(/\s+/g, ' ').trim(),
    undefined
  );
}

/**
 * Polls `probe` until it returns a value or `timeoutMs` passes.
 * @template T
 * @param {() => Promise<T | null>} probe
 * @param {number} [timeoutMs]
 * @returns {Promise<T | null>}
 */
export async function waitFor(probe, timeoutMs = STEP_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await probe().catch(() => null);
    if (value !== null) return value;
    if (Date.now() >= deadline) return null;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

/**
 * The OnPass form after 즉시지원 was clicked: a popup window, an iframe layer, or the posting
 * page itself when JobKorea navigates in place.
 * @param {Pick<import('@cloudflare/puppeteer').Browser, 'targets'>} browser
 * @param {ApplyPage} page
 * @param {number} [timeoutMs]
 * @returns {Promise<ApplyFrame | null>}
 */
export async function openOnPass(browser, page, timeoutMs = STEP_TIMEOUT_MS) {
  const isOnPass = (/** @type {string} */ url) => url.includes(ONPASS_PATH);
  return waitFor(async () => {
    const popup = browser.targets().find((target) => isOnPass(target.url()));
    if (popup) return popup.page();
    if (isOnPass(page.url())) return page;
    return page.frames().find((frame) => isOnPass(frame.url())) ?? null;
  }, timeoutMs);
}
