import { restrictToJobKorea } from '../jobkorea-request-filter.js';

/**
 * Keep the editor's own scripts and photo requests, but avoid third-party scripts that can
 * prevent DOMContentLoaded. Return the document status for missing-draft diagnostics.
 * @param {import('@cloudflare/puppeteer').Page} page
 * @param {string} url
 * @returns {Promise<number | undefined>}
 */
export async function openJobKoreaEditorPage(page, url) {
  await restrictToJobKorea(page, new Set(['media', 'font']));
  const document = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  return document?.status();
}
