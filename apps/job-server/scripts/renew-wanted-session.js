#!/usr/bin/env node
/**
 * Renew Wanted session via Puppeteer headless login.
 * Uses page.type() for React controlled inputs.
 * Requires: WANTED_EMAIL, WANTED_PASSWORD, PUPPETEER_EXECUTABLE_PATH
 */
import { withStealthBrowser } from '../src/crawlers/browser-utils.js';
import SessionManager from '../src/shared/services/session/session-manager.js';

const email = process.env.WANTED_EMAIL;
const password = process.env.WANTED_PASSWORD;

if (!email || !password) {
  console.error('WANTED_EMAIL and WANTED_PASSWORD required');
  process.exit(1);
}

console.log('Renewing Wanted session for:', email);

try {
  const newSession = await withStealthBrowser(async (page) => {
    // Inject existing cookies if any
    const existing = SessionManager.load('wanted');
    if (existing?.cookies && Array.isArray(existing.cookies)) {
      const valid = existing.cookies.filter((c) => c.name && c.value && c.domain);
      if (valid.length) {
        await page.setCookie(...valid);
        console.log('  Injected', valid.length, 'existing cookies');
      }
    }

    // Check if already logged in
    await page.goto('https://www.wanted.co.kr', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 3000));

    let loggedIn = await page.evaluate(
      () => !!document.querySelector('[data-testid="profile-button"]')
    );

    if (loggedIn) {
      console.log('  Already logged in via cookies');
    } else {
      console.log('  Not logged in, navigating to login page...');
      await page.goto('https://www.wanted.co.kr/login', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await new Promise((r) => setTimeout(r, 3000));

      // Find email input
      const emailInput = await page.$('input[type="email"]');
      if (!emailInput) {
        // Fallback: first text/email input
        const firstInput = await page.$('input[type="text"], input:not([type])');
        if (!firstInput) {
          await page.screenshot({ path: '/tmp/wanted-login-no-input.png' });
          throw new Error('No email input found on login page');
        }
        await firstInput.click({ clickCount: 3 });
        await firstInput.type(email, { delay: 30 });
      } else {
        await emailInput.click({ clickCount: 3 });
        await emailInput.type(email, { delay: 30 });
      }
      console.log('  Email entered');

      await new Promise((r) => setTimeout(r, 500));

      // Find password input
      const passInput = await page.$('input[type="password"]');
      if (passInput) {
        await passInput.click({ clickCount: 3 });
        await passInput.type(password, { delay: 30 });
        console.log('  Password entered');
      }

      await new Promise((r) => setTimeout(r, 500));

      // Submit
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        console.log('  Submit clicked');
      } else {
        await page.keyboard.press('Enter');
        console.log('  Enter pressed');
      }

      await new Promise((r) => setTimeout(r, 6000));

      // Check for CAPTCHA / WAF
      const blocked = await page.evaluate(() => {
        const text = document.body?.textContent || '';
        return (
          text.includes('CAPTCHA') ||
          text.includes('보안문자') ||
          text.includes('CloudFront') ||
          text.includes('Access Denied')
        );
      });

      if (blocked) {
        await page.screenshot({ path: '/tmp/wanted-captcha.png' });
        throw new Error('CAPTCHA or WAF block detected');
      }

      loggedIn = await page.evaluate(
        () => !!document.querySelector('[data-testid="profile-button"]')
      );

      if (!loggedIn) {
        // Check URL - if redirected to home, might be logged in
        const currentUrl = page.url();
        console.log('  Current URL:', currentUrl);
        if (currentUrl.includes('/login')) {
          await page.screenshot({ path: '/tmp/wanted-login-failed.png' });
          throw new Error('Login failed - still on login page');
        }
        console.log('  Redirected away from login - assuming success');
      } else {
        console.log('  Login successful');
      }
    }

    // Extract fresh cookies
    const cookies = await page.cookies();
    return {
      platform: 'wanted',
      cookies,
      cookieString: cookies.map((c) => `${c.name}=${c.value}`).join('; '),
      cookieCount: cookies.length,
      email,
      renewedAt: new Date().toISOString(),
      extractedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      timestamp: Date.now(),
    };
  });

  SessionManager.save('wanted', newSession);
  console.log('\n✅ Session renewed:', newSession.cookieCount, 'cookies');
  console.log('   Expires:', newSession.expiresAt);

  // Verify session works
  const api = await SessionManager.getAPI('wanted');
  if (api) {
    try {
      const profile = await api.getProfile();
      console.log('   Profile:', profile?.user?.name || 'verified');
    } catch (verifyError) {
      console.log('   Profile check failed:', verifyError.message);
    }
  }
} catch (error) {
  console.error('❌ Renewal failed:', error.message);
  process.exit(1);
}
