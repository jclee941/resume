import { sleep } from './page-utils.js';

export async function resolveInput(page, selectors) {
  for (const selector of selectors) {
    const input = await page.$(selector);
    if (input) {
      return input;
    }
  }

  return null;
}

export async function fillLoginForm(page, { email, password, log }) {
  const emailInput = await resolveInput(page, [
    'input[name="M_ID"]',
    'input[type="email"]',
    'input[type="text"][id*="id" i]',
  ]);
  if (!emailInput) {
    throw new Error('JobKorea email input not found');
  }

  await emailInput.click({ clickCount: 3 });
  await emailInput.type(email, { delay: 35 });
  log('Email entered');
  await sleep(500);

  const passwordInput = await resolveInput(page, ['input[name="M_PWD"]', 'input[type="password"]']);
  if (!passwordInput) {
    throw new Error('JobKorea password input not found');
  }

  await passwordInput.click({ clickCount: 3 });
  await passwordInput.type(password, { delay: 35 });
  log('Password entered');
  await sleep(500);
}

export async function clickVisibleSubmit(page, { log }) {
  const candidates = await page.$$('button[type="submit"], input[type="submit"]');
  for (const candidate of candidates) {
    const visible = await candidate.evaluate((element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity || '1') > 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    });

    if (visible) {
      await candidate.click();
      log('Submit clicked');
      await sleep(5000);
      return;
    }
  }

  throw new Error('Visible submit button not found');
}
