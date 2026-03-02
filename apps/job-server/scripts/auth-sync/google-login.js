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

  log('Looking for Google login button', 'info', platformKey);
  if (typeof config.screenshot === 'function') {
    await config.screenshot(`${platformKey}-login-page`);
  }

  let googleClicked = false;

  if (platformKey === 'jobkorea') {
    const links = await page.$$('a');
    for (const link of links) {
      const attrs = await link.evaluate((el) => ({
        href: el.href || '',
        onclick: el.getAttribute('onclick') || '',
        class: el.className || '',
      }));
      if (
        attrs.href.includes('google') ||
        attrs.onclick.includes('google') ||
        attrs.onclick.includes('Google')
      ) {
        await link.click();
        googleClicked = true;
        log('Clicked Google link (JobKorea)', 'info', platformKey);
        break;
      }
    }

    if (!googleClicked) {
      const snsButtons = await page.$$(
        '.sns-login a, .social-login a, [class*="sns"] a, [class*="social"] a'
      );
      if (snsButtons.length >= 4) {
        await snsButtons[3].click();
        googleClicked = true;
        log('Clicked 4th social button (likely Google)', 'info', platformKey);
      }
    }
  } else if (platformKey === 'saramin') {
    const buttons = await page.$$('button, a');
    for (const btn of buttons) {
      const attrs = await btn.evaluate((el) => ({
        href: el.href || '',
        onclick: el.getAttribute('onclick') || '',
        text: el.textContent || '',
        class: el.className || '',
      }));
      if (
        attrs.href.includes('google') ||
        attrs.onclick.includes('google') ||
        attrs.text.toLowerCase().includes('google') ||
        attrs.class.includes('google')
      ) {
        await btn.click();
        googleClicked = true;
        log('Clicked Google button (Saramin)', 'info', platformKey);
        break;
      }
    }
  }

  if (!googleClicked) {
    const images = await page.$$('img');
    for (const img of images) {
      const src = await img.evaluate((el) => el.src || '');
      if (src.toLowerCase().includes('google')) {
        await img.evaluate((el) => {
          const clickable = el.closest('a') || el.closest('button') || el.parentElement;
          if (clickable) clickable.click();
          else el.click();
        });
        googleClicked = true;
        log('Clicked Google button (via image)', 'info', platformKey);
        break;
      }
    }
  }

  if (!googleClicked) {
    const allElements = await page.$$("button, a, div[role='button']");
    for (const el of allElements) {
      const text = await el.evaluate((e) => {
        const t = (
          e.textContent ||
          e.alt ||
          e.title ||
          e.getAttribute('aria-label') ||
          ''
        ).toLowerCase();
        return t;
      });
      if (text.includes('google') || text.includes('구글')) {
        await el.click();
        googleClicked = true;
        log('Clicked Google button (via text)', 'info', platformKey);
        break;
      }
    }
  }

  if (!googleClicked) {
    log('Could not find Google login button', 'error', platformKey);
    if (typeof config.screenshot === 'function') {
      await config.screenshot(`${platformKey}-no-google-btn`);
    }
    return false;
  }

  log('Waiting for Google OAuth popup', 'info', platformKey);
  let googlePage = null;

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
