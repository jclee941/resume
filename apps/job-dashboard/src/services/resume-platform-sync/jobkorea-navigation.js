import { restrictToJobKorea } from '../jobkorea-request-filter.js';

/**
 * Keep the editor's own scripts and photo requests, but avoid third-party scripts that can
 * prevent DOMContentLoaded. Diagnostics omit query strings, including the resume number.
 * @param {import('@cloudflare/puppeteer').Page} page
 * @param {string} url
 * @returns {Promise<void>}
 */
export async function openJobKoreaEditorPage(page, url) {
  const requests = await restrictToJobKorea(page, new Set(['media', 'font']));
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
  } catch (error) {
    const pending = requests.pending().slice(0, 5).join(', ') || 'none';
    const failed = requests.failed().join(', ') || 'none';
    throw new Error(`JobKorea editor navigation failed; pending: ${pending}; failed: ${failed}`, {
      cause: error,
    });
  }
}
