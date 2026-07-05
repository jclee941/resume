function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function loginWanted(page, config, log) {
  const platform = config.platform;
  log('Navigating to login page', 'info', 'wanted');

  await page.goto(platform.urls.login, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForSelector('button, a[role="button"], div[role="button"]', {
    timeout: 10000,
  });

  const cookies = await page.cookies();
  if (cookies.some((c) => c.name === platform.sessionCookie)) {
    log('Already logged in', 'success', 'wanted');
    return true;
  }

  log('Clicking email login button', 'info', 'wanted');
  const buttons = await page.$$('button, a[role="button"], div[role="button"]');
  for (const btn of buttons) {
    const text = await btn.evaluate((el) => el.textContent?.toLowerCase() || '');
    if (text.includes('email') || text.includes('이메일')) {
      await btn.click();
      await sleep(2000);
      break;
    }
  }
  await page.waitForSelector(
    'input[type="email"], input[type="text"][name*="email"], input[placeholder*="이메일"], input[placeholder*="email"]',
    { timeout: 10000 }
  );

  log('Entering email', 'info', 'wanted');
  const emailInput = await page.waitForSelector(
    'input[type="email"], input[type="text"][name*="email"], input[placeholder*="이메일"], input[placeholder*="email"]',
    { timeout: 10000 }
  );
  await emailInput.click({ clickCount: 3 });
  await emailInput.type(config.WANTED_EMAIL, { delay: 30 });

  log('Clicking next', 'info', 'wanted');
  const nextButtons = await page.$$('button[type="submit"], button');
  for (const btn of nextButtons) {
    const text = await btn.evaluate((el) => el.textContent?.toLowerCase() || '');
    if (
      text.includes('다음') ||
      text.includes('계속') ||
      text.includes('next') ||
      text.includes('이메일로')
    ) {
      await btn.click();
      break;
    }
  }
  await page.waitForSelector('input[type="password"]', {
    visible: true,
    timeout: 10000,
  });

  log('Entering password', 'info', 'wanted');
  const passwordInput = await page.waitForSelector('input[type="password"]', {
    visible: true,
    timeout: 10000,
  });
  await passwordInput.click();
  await passwordInput.type(config.WANTED_PASSWORD, { delay: 30 });

  log('Clicking login', 'info', 'wanted');
  const loginButtons = await page.$$('button[type="submit"], button');
  for (const btn of loginButtons) {
    const text = await btn.evaluate((el) => el.textContent?.toLowerCase() || '');
    if (text.includes('로그인') || text.includes('login')) {
      await btn.click();
      break;
    }
  }

  await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});

  const finalCookies = await page.cookies();
  const loggedIn = finalCookies.some((c) => c.name === platform.sessionCookie);

  if (loggedIn) {
    log('Login successful', 'success', 'wanted');
    return true;
  }

  log('Login failed', 'error', 'wanted');
  if (typeof config.screenshot === 'function') {
    await config.screenshot('wanted-login-failed');
  }
  return false;
}
