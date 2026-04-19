import SessionManager from '../../src/shared/services/session/session-manager.js';

import { log } from './logging.js';
import { shipToElk } from './logging.js';

export async function checkSessionHealth() {
  const warnings = [];
  for (const platform of ['wanted', 'jobkorea']) {
    const session = SessionManager.load(platform);
    if (!session) {
      warnings.push(`${platform}: no session`);
      await tryAutoRenew(platform, warnings);
      continue;
    }

    if (platform === 'jobkorea' && Array.isArray(session.cookies)) {
      const jkat = session.cookies.find((cookie) => cookie.name === 'jkat');
      if (jkat?.value) {
        try {
          const payload = JSON.parse(Buffer.from(jkat.value.split('.')[1], 'base64url').toString());
          if (payload.exp && Date.now() > payload.exp * 1000) {
            warnings.push(
              `jobkorea: JWT expired ${Math.round((Date.now() - payload.exp * 1000) / 3600000)}h ago`
            );
            await tryAutoRenew('jobkorea', warnings);
            continue;
          }
        } catch {
          // not a JWT, skip
        }
      }
    }

    const expiresAt = session.expiresAt ? new Date(session.expiresAt) : null;
    if (!expiresAt) continue;

    const hoursLeft = (expiresAt - Date.now()) / 3600000;
    if (hoursLeft < 0) {
      warnings.push(`${platform}: EXPIRED`);
      await tryAutoRenew(platform, warnings);
    } else if (hoursLeft < 24) {
      warnings.push(`${platform}: expires in ${Math.round(hoursLeft)}h`);
      await tryAutoRenew(platform, warnings);
    }
  }

  return warnings;
}

export async function tryAutoRenew(platform, warnings) {
  if (platform === 'wanted') return tryRenewWanted(warnings);
  if (platform === 'jobkorea') return tryRenewJobKorea(warnings);
  warnings.push(`${platform}: auto-renew not supported`);
}

export async function tryRenewJobKorea(warnings) {
  const username = process.env.JOBKOREA_USERNAME;
  const password = process.env.JOBKOREA_PASSWORD;
  if (!username || !password) {
    warnings.push('jobkorea: JOBKOREA_USERNAME/PASSWORD not set in .env');
    return;
  }

  let browser;
  try {
    const { chromium } = await import('playwright');
    log('renewing jobkorea session via Playwright...');
    browser = await chromium.launch({
      headless: true,
      channel: 'chrome',
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    });
    const ctx = await browser.newContext({ locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
    const page = await ctx.newPage();
    await page.goto('https://www.jobkorea.co.kr/Login/Login_Tot.asp', {
      waitUntil: 'load',
      timeout: 30000,
    });
    await page.waitForTimeout(3000);
    await page.fill('#M_ID', username);
    await page.fill('#M_PWD', password);
    await page.click('button[type="submit"].login-button');
    await page.waitForTimeout(5000);
    const url = page.url();
    if (url.includes('Login')) throw new Error('still on login page after submit');
    const cookies = await ctx.cookies();
    const jkat = cookies.find((cookie) => cookie.name === 'jkat');
    if (!jkat) throw new Error('jkat cookie not found after login');

    const newSession = {
      platform: 'jobkorea',
      cookies,
      cookieString: cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; '),
      cookieCount: cookies.length,
      renewedAt: new Date().toISOString(),
      extractedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      timestamp: Date.now(),
    };
    SessionManager.save('jobkorea', newSession);
    warnings.push(`jobkorea: ✅ renewed (${cookies.length} cookies)`);
    log('jobkorea session renewed', { cookies: cookies.length });
    await shipToElk('session_renewed', { platform: 'jobkorea', cookies: cookies.length });
  } catch (error) {
    warnings.push(`jobkorea: ❌ renewal failed — ${error.message}`);
    log('jobkorea renewal failed', error.message);
    await shipToElk('session_renewal_failed', { platform: 'jobkorea', error: error.message });
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

export async function tryRenewWanted(warnings) {
  const email = process.env.WANTED_EMAIL;
  const password = process.env.WANTED_PASSWORD;
  if (!email || !password) {
    warnings.push('wanted: WANTED_EMAIL/PASSWORD not set');
    return;
  }

  let browser;
  try {
    const { chromium } = await import('playwright');
    log('renewing wanted session via Playwright (id.wanted.jobs)...');

    browser = await chromium.launch({
      headless: true,
      channel: 'chrome',
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    });
    const ctx = await browser.newContext({ locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
    const page = await ctx.newPage();

    await page.goto('https://id.wanted.jobs/login', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(5000);

    await page.getByText('이메일로 계속하기').click();
    await page.waitForTimeout(3000);

    await page.locator('input').first().click();
    await page.locator('input').first().pressSequentially(email, { delay: 20 });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const button = document.querySelector('button[type="submit"]');
      if (button) {
        button.disabled = false;
        button.click();
      }
    });
    await page.waitForTimeout(5000);

    const passInput = page.locator('input[type="password"]').first();
    if (await passInput.count()) {
      await passInput.click();
      await passInput.pressSequentially(password, { delay: 20 });
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const button = document.querySelector('button[type="submit"]');
        if (button) {
          button.disabled = false;
          button.click();
        }
      });
      await page.waitForTimeout(8000);
    }

    const cookies = await ctx.cookies();
    const auth = cookies.filter((cookie) => /token|oneid|wanted/i.test(cookie.name));
    if (auth.length === 0) throw new Error('no auth cookies after login');

    const newSession = {
      platform: 'wanted',
      email,
      cookies,
      cookieString: cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; '),
      cookieCount: cookies.length,
      renewedAt: new Date().toISOString(),
      extractedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      timestamp: Date.now(),
    };
    SessionManager.save('wanted', newSession);
    warnings.push(
      `wanted: ✅ renewed (${newSession.cookieCount} cookies, expires ${newSession.expiresAt.slice(0, 16)})`
    );
    log('wanted session renewed', { cookies: newSession.cookieCount });
    await shipToElk('session_renewed', { platform: 'wanted', cookies: newSession.cookieCount });
  } catch (error) {
    warnings.push(`wanted: ❌ renewal failed — ${error.message}`);
    log('wanted renewal failed', error.message);
    await shipToElk('session_renewal_failed', { platform: 'wanted', error: error.message });
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
