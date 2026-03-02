/**
 * Browser utilities for Node.js platform crawlers.
 *
 * Provides a stealth-patched puppeteer session via `withStealthBrowser()`,
 * eliminating duplicated launch/teardown boilerplate across platform crawlers.
 * Imports stealth patches (pure JS) from the CF Workers browser service.
 */

import {
  generateFingerprint,
  applyStealthPatches,
} from '../../workers/src/services/browser/stealth-patches.js';

const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
];

/**
 * Execute an action inside a stealth-patched puppeteer browser session.
 *
 * @param {(page: import('puppeteer').Page) => Promise<T>} action - Receives a stealth-patched page
 * @returns {Promise<T>} Result of the action
 * @template T
 */
export async function withStealthBrowser(action) {
  let browser = null;
  try {
    const puppeteer = await import('puppeteer').then((m) => m.default);

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: LAUNCH_ARGS,
    });

    const page = await browser.newPage();
    const fingerprint = generateFingerprint();
    await applyStealthPatches(page, fingerprint);

    return await action(page);
  } finally {
    if (browser) await browser.close();
  }
}
