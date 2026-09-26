import { findAndClickGoogleButton } from './google-login-button.js';
import { handleGoogleOAuth } from './google-login-oauth.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function loginWithGoogle(browser, page, config, log) {
  const platformKey = config.platformKey;
  const platform = config.platform;
  log('Navigating to login page', 'info', platformKey);

  try {
    await page.goto(platform.urls.login, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
  } catch (e) {
    log(`Navigation warning: ${e.message}, continuing...`, 'warn', platformKey);
  }
  await sleep(3000);

  const cookies = await page.cookies();
  if (cookies.some((c) => c.name === platform.sessionCookie)) {
    log('Already logged in', 'success', platformKey);
    return true;
  }

  const clicked = await findAndClickGoogleButton(page, platformKey, config, log);
  if (!clicked) {
    return false;
  }

  return handleGoogleOAuth(browser, page, config, log);
}
