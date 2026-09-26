/**
 * Browser instance lifecycle operations for BrowserPool.
 */

import { generateFingerprint, applyStealthPatches } from '@resume/shared/browser';

/**
 * @typedef {import('@cloudflare/puppeteer').Page} CloudflarePage
 *
 * @typedef {{
 *   close(): Promise<void>;
 *   isConnected(): boolean;
 *   on(event: string, handler: () => void): void;
 *   newPage(): Promise<CloudflarePage>;
 * }} BrowserInstance
 *
 * @typedef {{
 *   browser: BrowserInstance;
 *   page: CloudflarePage;
 *   id: string;
 *   inUse: boolean;
 *   createdAt: Date;
 *   lastUsedAt: Date;
 *   useCount: number;
 *   userAgent: string;
 * }} BrowserPoolEntry
 */

const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--disable-features=TranslateUI',
  '--disable-extensions',
  '--no-first-run',
  '--window-size=1920,1080',
];

/**
 * @param {{
 *   pool: Map<string, BrowserPoolEntry>;
 *   rotateUA?: boolean;
 *   onDisconnected: (id: string) => void;
 * }} options
 * @returns {Promise<BrowserPoolEntry>}
 */
export async function createBrowser({ pool, rotateUA = true, onDisconnected }) {
  const puppeteer =
    /** @type {{ launch(options?: { headless?: string | boolean; executablePath?: string; args?: string[] }): Promise<BrowserInstance> }} */ (
      await import('puppeteer').then((module) => module.default)
    );

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: LAUNCH_ARGS,
  });

  const page = await browser.newPage();
  const fingerprint = generateFingerprint();
  await applyStealthPatches(page, rotateUA ? fingerprint : undefined);

  const id = `browser-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const entry = {
    browser,
    page,
    id,
    inUse: true,
    createdAt: new Date(),
    lastUsedAt: new Date(),
    useCount: 1,
    userAgent: fingerprint.ua,
  };

  pool.set(id, entry);
  browser.on('disconnected', () => onDisconnected(id));
  return entry;
}

/**
 * @param {{
 *   entry: BrowserPoolEntry;
 *   pool: Map<string, BrowserPoolEntry>;
 *   metrics: { closed: number };
 *   emit: (event: string, payload: Record<string, unknown>) => void;
 *   logger: { debug: (msg: string, ...args: unknown[]) => void };
 * }} options
 * @returns {Promise<void>}
 */
export async function closeBrowser({ entry, pool, metrics, emit, logger }) {
  pool.delete(entry.id);

  try {
    await entry.browser.close();
    metrics.closed++;
    emit('closed:browser', { browserId: entry.id });
  } catch (error) {
    logger.debug('Error closing browser:', error instanceof Error ? error.message : String(error));
  }
}

/**
 * @param {BrowserPoolEntry} entry
 * @returns {Promise<boolean>}
 */
export async function isHealthy(entry) {
  try {
    if (!entry.browser.isConnected()) {
      return false;
    }

    await entry.page.evaluate(() => true);
    return true;
  } catch (_error) {
    return false;
  }
}

/**
 * @param {BrowserPoolEntry} entry
 * @param {{ debug: (msg: string, ...args: unknown[]) => void }} logger
 * @returns {Promise<void>}
 */
export async function resetPageState(entry, logger) {
  try {
    await entry.page.deleteCookie(...(await entry.page.cookies()));
    await entry.page.goto('about:blank');
  } catch (error) {
    logger.debug(
      'Failed to clear page state:',
      error instanceof Error ? error.message : String(error)
    );
  }
}
