export async function findAndClickGoogleButton(page, platformKey, config, log) {
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

  return true;
}
