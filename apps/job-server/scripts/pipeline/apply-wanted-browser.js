import { log, summarizeError } from './logging.js';

export async function acquireOneIdToken(session) {
  const email = process.env.WANTED_EMAIL;
  const password = process.env.WANTED_PASSWORD;
  const clientId = process.env.WANTED_ONEID_CLIENT_ID;
  let oneidToken = null;

  if (email && password && clientId) {
    try {
      const tokenResp = await fetch('https://id-api.wanted.co.kr/v1/auth/token', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Origin: 'https://id.wanted.co.kr',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'oneid-agent': 'web',
        },
        body: JSON.stringify({
          grant_type: 'password',
          email,
          password,
          client_id: clientId,
          beforeUrl: 'https://www.wanted.co.kr/',
          stay_signed_in: true,
        }),
      });
      if (tokenResp.ok) {
        const payload = await tokenResp.json();
        oneidToken = payload?.token;
        log('OneID token minted for browser submission');
      }
    } catch (tokenError) {
      log('OneID token mint failed:', summarizeError(tokenError));
    }
  }

  if (!oneidToken) {
    const cookieStr =
      session.cookieString || (typeof session.cookies === 'string' ? session.cookies : '');
    const match = cookieStr.match(/WWW_ONEID_ACCESS_TOKEN=([^;\s]+)/);
    oneidToken = match?.[1] || null;
  }

  return oneidToken;
}

export async function createWantedApplyBrowser(session, sleep) {
  const oneidToken = await acquireOneIdToken(session);
  if (!oneidToken) {
    log('no OneID token available for browser submission, apply phase skipped');
    return null;
  }

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  const ctx = await browser.newContext({
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
  });
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });
  const page = await ctx.newPage();

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.setCookie', {
    name: 'WWW_ONEID_ACCESS_TOKEN',
    value: oneidToken,
    domain: '.wanted.co.kr',
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
  });
  await cdp.detach();

  await page.goto('https://www.wanted.co.kr/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(2000);
  log('browser ready for wanted submissions');

  return { browser, page };
}
