function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function handleGoogleOAuth(browser, page, config, log) {
  const platformKey = config.platformKey;
  const platform = config.platform;

  log('Waiting for Google OAuth popup', 'info', platformKey);
  let googlePage;

  const popupPromise = new Promise((resolve) => {
    browser.once('targetcreated', async (target) => {
      const popup = await target.page();
      if (popup && target.url().includes('accounts.google.com')) {
        resolve(popup);
      }
    });
  });

  await sleep(3000);
  const pages = await browser.pages();
  googlePage = pages.find((p) => p.url().includes('accounts.google.com'));

  if (!googlePage) {
    if (page.url().includes('accounts.google.com')) {
      googlePage = page;
    } else {
      googlePage = await Promise.race([popupPromise, sleep(5000).then(() => null)]);
    }
  }

  if (!googlePage) {
    log('Google OAuth page not found - popup may be blocked', 'error', platformKey);
    if (typeof config.screenshot === 'function') {
      await config.screenshot(`${platformKey}-no-google-popup`);
    }
    return false;
  }

  await googlePage.bringToFront();
  log(`Google page URL: ${googlePage.url()}`, 'info', platformKey);

  log('Entering Google email', 'info', platformKey);
  try {
    await googlePage.waitForSelector('input[type="email"]', {
      timeout: 15000,
    });
    await googlePage.type('input[type="email"]', config.GOOGLE_EMAIL, {
      delay: 50,
    });
    await sleep(500);

    const nextBtn = await googlePage.$('#identifierNext');
    if (nextBtn) {
      await nextBtn.click();
    } else {
      await googlePage.keyboard.press('Enter');
    }
    await sleep(4000);

    await googlePage.screenshot({
      path: `${config.SCREENSHOTS_DIR}/${platformKey}-google-after-email-${Date.now()}.png`,
      fullPage: true,
    });
    log('Captured Google page after email entry', 'info', platformKey);
  } catch (e) {
    log(`Email entry issue: ${e.message}`, 'warn', platformKey);
    await googlePage
      .screenshot({
        path: `${config.SCREENSHOTS_DIR}/${platformKey}-google-email-error-${Date.now()}.png`,
        fullPage: true,
      })
      .catch(() => {});
  }

  log('Entering Google password', 'info', platformKey);
  try {
    await googlePage.waitForSelector('input[type="password"]', {
      visible: true,
      timeout: 15000,
    });
    await googlePage.type('input[type="password"]', config.GOOGLE_PASSWORD, {
      delay: 50,
    });
    await sleep(500);

    const passBtn = await googlePage.$('#passwordNext');
    if (passBtn) {
      await passBtn.click();
    } else {
      await googlePage.keyboard.press('Enter');
    }
    await sleep(5000);
  } catch (e) {
    log(`Password entry failed: ${e.message}`, 'error', platformKey);
    if (typeof config.screenshot === 'function') {
      await config.screenshot(`${platformKey}-google-password-error`);
    }
    return false;
  }

  log('Waiting for OAuth redirect', 'info', platformKey);
  await page.bringToFront();

  await Promise.race([
    page.waitForNavigation({
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    }),
    sleep(10000),
  ]).catch(() => {});

  await sleep(3000);

  const finalCookies = await page.cookies();
  const loggedIn = finalCookies.some((c) => c.name === platform.sessionCookie);

  if (loggedIn) {
    log('Login successful', 'success', platformKey);
    return true;
  }

  log('Login verification failed', 'warn', platformKey);
  if (typeof config.screenshot === 'function') {
    await config.screenshot(`${platformKey}-login-result`);
  }
  return finalCookies.length > 5;
}
