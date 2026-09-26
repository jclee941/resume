import { CONFIG } from '../constants.js';
import { getEditUrl } from './change-detection.js';
import {
  assertJobKoreaResumeAccess,
  assertEditableResume,
  waitForEditableForm,
} from './session.js';
import { toPlaywrightCookies } from '../../jobkorea-session/cookie-utils.js';
import { loadSavedJobKoreaCookies, renewSavedJobKoreaSession } from './sync-session-renewal.js';

export async function prepareJobKoreaEditPage({
  page,
  context,
  handler,
  cookies,
  options = {},
  logger,
  dryRun,
  ensureResumeAccess = assertJobKoreaResumeAccess,
}) {
  const editUrl = getEditUrl();
  let currentCookies = cookies;
  logger(`Navigating to ${editUrl}`, 'info', 'jobkorea');
  await page.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

  if (page.url().includes('/Login')) {
    if (dryRun) {
      throw new Error('JobKorea session expired during dry-run; run apply sync to auto-renew');
    }
    logger('Session expired on resume page, auto-renewing via Puppeteer...', 'warn', 'jobkorea');
    try {
      await renewSavedJobKoreaSession(options, logger);
      const renewedCookies = loadSavedJobKoreaCookies(handler, {
        allowFallbackSave: !dryRun,
      });
      if (renewedCookies) {
        currentCookies = renewedCookies;
        await context.clearCookies();
        await context.addCookies(toPlaywrightCookies(renewedCookies));
        await page.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      } else {
        throw new Error('Session auto-renewal did not produce saved JobKorea cookies');
      }
    } catch (renewError) {
      throw new Error(`Session auto-renewal failed: ${renewError.message}`, { cause: renewError });
    }
  }

  await ensureResumeAccess(page, {
    headlessEnv: String(CONFIG.HEADLESS),
    logger,
  });

  const rNo = process.env.JOBKOREA_RNO?.trim() || '';
  await assertEditableResume(page, { rNo });
  await waitForEditableForm(page, { rNo });

  return { editUrl, cookies: currentCookies };
}
