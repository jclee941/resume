/**
 * Browser utilities for Node.js platform crawlers.
 *
 * Provides a stealth-patched puppeteer session via `withStealthBrowser()`,
 * eliminating duplicated launch/teardown boilerplate across platform crawlers.
 * Imports stealth patches (pure JS) from the CF Workers browser service.
 */

import { generateFingerprint, applyStealthPatches } from '@resume/shared/browser';

const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
];

async function safeBrowserClose(browser, timeoutMs = 10000) {
  if (!browser) return;
  try {
    await Promise.race([
      browser.close(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('browser.close() timed out')), timeoutMs)
      ),
    ]);
  } catch {
    try {
      const proc = browser.process();
      if (proc) proc.kill('SIGKILL');
    } catch {
      // Best-effort cleanup.
    }
  }
}

function resolveHeadlessMode(headless) {
  if (typeof headless !== 'undefined') {
    return headless;
  }

  if (process.env.HEADLESS === 'false') {
    return false;
  }

  return 'new';
}

/**
 * Execute an action inside a stealth-patched puppeteer browser session.
 *
 * @param {(page: import('puppeteer').Page) => Promise<T>} action - Receives a stealth-patched page
 * @returns {Promise<T>} Result of the action
 * @template T
 */
export async function withStealthBrowser(action, options = {}) {
  let browser = null;
  try {
    const puppeteer = await import('puppeteer').then((m) => m.default);

    browser = await puppeteer.launch({
      headless: resolveHeadlessMode(options.headless),
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: LAUNCH_ARGS,
    });

    const page = await browser.newPage();
    const fingerprint = generateFingerprint();
    await applyStealthPatches(page, fingerprint);

    return await action(page);
  } finally {
    await safeBrowserClose(browser);
  }
}
export async function launchStealthBrowser() {
  const puppeteer = await import('puppeteer').then((m) => m.default);
  const browser = await puppeteer.launch({
    headless: resolveHeadlessMode(),
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: LAUNCH_ARGS,
  });
  const page = await browser.newPage();
  const fingerprint = generateFingerprint();
  await applyStealthPatches(page, fingerprint);
  return { browser, page };
}
