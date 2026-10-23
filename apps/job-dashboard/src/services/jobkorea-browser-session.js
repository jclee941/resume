import puppeteerDefault from '@cloudflare/puppeteer';
import { settleWithin } from './browser-session.js';

/**
 * JobKorea resets authenticated document loads from the binding browser, while the REST CDP
 * browser completes the same login and editor flow. Keep both in one REST browser and close it
 * after use. The existing REMEMBER_BROWSER_* secrets authorize account-wide Browser Run access;
 * they are reused here rather than provisioning a second copy of the same credential.
 * @template T
 * @param {Parameters<typeof import('./browser-session.js').withBrowserSession>[0] & {
 *   REMEMBER_BROWSER_ACCOUNT_ID?: string;
 *   REMEMBER_BROWSER_API_TOKEN?: string;
 * }} env
 * @param {(browser: import('@cloudflare/puppeteer').Browser) => Promise<T>} fn
 * @param {{
 *   fetchImpl?: typeof fetch;
 *   puppeteer?: Pick<typeof puppeteerDefault, 'connect'>;
 *   assertOpen?: (next: string) => void;
 *   name?: string;
 * }} [options]
 * @returns {Promise<T>}
 */
export async function withJobKoreaBrowserSession(env, fn, options = {}) {
  const { fetchImpl = fetch, puppeteer = puppeteerDefault, assertOpen = () => {} } = options;
  const account = env.REMEMBER_BROWSER_ACCOUNT_ID;
  const token = env.REMEMBER_BROWSER_API_TOKEN;
  if (!account || !token) throw new Error('JobKorea Browser Run credentials are not configured');
  assertOpen('the browser was acquired');
  const response = await fetchImpl(
    `https://api.cloudflare.com/client/v4/accounts/${account}/browser-run/devtools/browser`,
    {
      headers: { Upgrade: 'websocket', Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(30_000),
    }
  );
  const socket = response.webSocket;
  if (!socket) {
    throw new Error(`JobKorea Browser Run connection failed (${response.status})`);
  }
  socket.accept();
  /** @type {import('@cloudflare/puppeteer').ConnectionTransport} */
  const transport = {
    send: (message) => socket.send(message),
    close: () => socket.close(),
  };
  socket.addEventListener('message', (event) => transport.onmessage?.(String(event.data)));
  socket.addEventListener('close', () => transport.onclose?.());
  /** @type {import('@cloudflare/puppeteer').Browser | undefined} */
  let browser;
  try {
    assertOpen('the browser connected');
    browser = await puppeteer.connect({ transport, protocolTimeout: 30_000 });
    assertOpen('the browser work started');
    return await fn(browser);
  } finally {
    if (browser) await settleWithin(browser.close(), 5_000);
    transport.close();
  }
}
