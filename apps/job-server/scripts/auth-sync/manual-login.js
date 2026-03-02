function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function loginManual(browser, page, config, log) {
  void browser;
  const platformKey = config.platformKey;
  const platform = config.platform;

  if (config.headless) {
    log('Manual login requires non-headless mode. Skipping.', 'warn', platformKey);
    log('Run without --headless flag to login manually', 'info', platformKey);
    return false;
  }

  log('Opening browser for manual login', 'info', platformKey);
  log('Please complete the Google OAuth login in the browser', 'info', platformKey);

  try {
    await page.goto(platform.urls.login, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
  } catch (e) {
    log(`Navigation warning: ${e.message}`, 'warn', platformKey);
  }
  await sleep(2000);

  const cookies = await page.cookies();
  if (cookies.some((c) => c.name === platform.sessionCookie)) {
    log('Already logged in', 'success', platformKey);
    return true;
  }

  log('Waiting for manual login (max 3 minutes)...', 'info', platformKey);
  log('After logging in, the script will automatically continue', 'info', platformKey);

  const startTime = Date.now();
  const timeout = 180000;

  while (Date.now() - startTime < timeout) {
    await sleep(3000);

    try {
      await page.goto(platform.urls.profile, {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      });
    } catch (error) {
      void error;
    }

    const currentCookies = await page.cookies();
    const hasSession = currentCookies.some((c) => c.name === platform.sessionCookie);
    const currentUrl = page.url();
    const notOnLogin = !currentUrl.includes('login') && !currentUrl.includes('auth');

    if (hasSession || (notOnLogin && currentCookies.length > 5)) {
      log('Login detected!', 'success', platformKey);
      return true;
    }

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    if (elapsed % 15 === 0) {
      log(`Still waiting for login... (${elapsed}s)`, 'info', platformKey);
    }
  }

  log('Login timeout - please try again', 'error', platformKey);
  return false;
}
