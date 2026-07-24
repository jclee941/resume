import { chromium } from 'playwright';
import { applyPlaywrightStealth } from '../playwright-stealth.js';
import { CONFIG } from '../constants.js';
import { log } from '../sync-logger.js';
import { buildJobKoreaFormData } from '../jobkorea-sections.js';
import { getEditUrl } from './change-detection.js';
import {
  assertJobKoreaResumeAccess,
  assertEditableResume,
  waitForEditableForm,
} from './session.js';
import { JobKoreaAPIClient } from './api-client.js';
import { buildCookieString, toPlaywrightCookies } from '../../jobkorea-session/cookie-utils.js';
import {
  executeHybridPortfolio,
  executeHybridSave,
  shouldUseHybridMode,
  getJobKoreaSyncMode,
} from './sync-hybrid.js';
import {
  assertJobKoreaCareerSlotCoverage,
  selectJobKoreaCareerSectionIndices,
} from './career-guards.js';
import { pickJobKoreaBrowserProfile } from '../../jobkorea-session/user-agent-pool.js';
import {
  activateRequiredSections,
  executePlaywrightSave,
  logChangeSummary,
  persistUpdatedCookies,
} from './sync-form.js';
import { appendPortfolioFields } from './sync-portfolio.js';
import { appendPhotoUpload } from './sync-photo.js';
import {
  loadOrRenewJobKoreaCookies,
  loadSavedJobKoreaCookies,
  renewSavedJobKoreaSession,
} from './sync-session-renewal.js';

export { assertJobKoreaCareerSlotCoverage } from './career-guards.js';

export async function syncJobKoreaProfile(handler, ssot, options = {}) {
  const logger = options.logger ?? log;
  const launchBrowser = options.launchBrowser ?? chromium.launch.bind(chromium);
  const ensureResumeAccess = options.assertJobKoreaResumeAccess ?? assertJobKoreaResumeAccess;
  const hybridMode = shouldUseHybridMode();
  const syncMode = getJobKoreaSyncMode();
  const dryRun = !CONFIG.APPLY || CONFIG.DIFF_ONLY || syncMode === 'api-dry-run';

  logger(
    hybridMode
      ? `Starting sync for JobKorea (${syncMode})`
      : 'Starting sync for JobKorea (via form POST)',
    'info',
    'jobkorea'
  );

  let cookies;
  try {
    cookies = await loadOrRenewJobKoreaCookies(handler, options, logger, {
      allowRenewal: !dryRun,
      allowFallbackSave: !dryRun,
    });
  } catch (error) {
    logger(`Sync failed: ${error.message}`, 'error', 'jobkorea');
    return { success: false, changes: [], error: error.message };
  }

  const browserProfile = pickJobKoreaBrowserProfile();
  const browser = await launchBrowser({ headless: CONFIG.HEADLESS });
  const context = await browser.newContext({
    userAgent: browserProfile.userAgent,
    viewport: browserProfile.viewport,
    locale: browserProfile.locale,
    timezoneId: browserProfile.timezoneId,
    extraHTTPHeaders: {
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    },
  });
  await applyPlaywrightStealth(context);

  let shouldPersistCookies = false;

  try {
    await context.addCookies(toPlaywrightCookies(cookies));
    const page = await context.newPage();

    const editUrl = getEditUrl();
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
          cookies = renewedCookies;
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

    await assertEditableResume(page, { rNo: process.env.JOBKOREA_RNO?.trim() || '' });

    shouldPersistCookies = !dryRun;

    await waitForEditableForm(page, { rNo: process.env.JOBKOREA_RNO?.trim() || '' });

    await activateRequiredSections(page);

    const sectionIndices = await handler.createEntrySlots(page, ssot, {
      recreateIntroEntries: !dryRun,
      recreateLicenseEntries: !dryRun,
    });
    logger(
      `Entry slots — Career: ${sectionIndices.career.length} (${sectionIndices.career.join(',')}), ` +
        `Intro: ${(sectionIndices.intro || []).length} (${(sectionIndices.intro || []).join(',')}), ` +
        `License: ${sectionIndices.license.length} (${sectionIndices.license.join(',')}), ` +
        `Award: ${sectionIndices.award.length} (${sectionIndices.award.join(',')}), ` +
        `School: ${sectionIndices.school}, ` +
        `Language: ${(sectionIndices.language || []).length} (${(sectionIndices.language || []).join(',')})`,
      'info',
      'jobkorea'
    );
    assertJobKoreaCareerSlotCoverage(ssot, sectionIndices, { dryRun });
    const saveSectionIndices = selectJobKoreaCareerSectionIndices(ssot, sectionIndices, {
      dryRun,
    });

    const targetFields = buildJobKoreaFormData(ssot, saveSectionIndices);
    let apiClient = null;
    if (hybridMode) {
      const apiCookieString = handler.loadSessionCookieString?.() || buildCookieString(cookies);
      apiClient =
        options.apiClient ??
        options.apiClientFactory?.({
          cookieString: apiCookieString,
          logger,
        }) ??
        new JobKoreaAPIClient({
          cookieString: apiCookieString,
          logger,
        });
      await executeHybridPortfolio(apiClient, ssot?.personal?.portfolio, targetFields, page, ssot, {
        logger,
        dryRun,
        fallbackPortfolio: (fallbackPage, fallbackSsot, fallbackFields) =>
          appendPortfolioFields(fallbackPage, fallbackSsot, fallbackFields, {
            registerPortfolioUrl: options.registerPortfolioUrl,
            logger,
            getTimestamp: options.getTimestamp,
          }),
      });
    } else if (dryRun) {
      logger('Portfolio registration skipped (dry-run)', 'info', 'jobkorea');
    } else {
      await appendPortfolioFields(page, ssot, targetFields, {
        registerPortfolioUrl: options.registerPortfolioUrl,
        logger,
        getTimestamp: options.getTimestamp,
      });
    }

    if (process.env.JOBKOREA_SYNC_PHOTO === 'true') {
      await appendPhotoUpload(page, { logger });
    }

    const currentFields = await page.evaluate(() => $('#frm1').serializeArray());
    const changes = handler.computeChanges(currentFields, targetFields);
    logChangeSummary(changes);

    if (hybridMode) {
      const saveResult = await executeHybridSave(
        apiClient,
        targetFields,
        page,
        saveSectionIndices,
        {
          logger,
          apply: CONFIG.APPLY,
          diffOnly: CONFIG.DIFF_ONLY,
          dryRun: syncMode === 'api-dry-run',
          fallbackSave: (fallbackPage, fallbackFields, fallbackSectionIndices) =>
            executePlaywrightSave(fallbackPage, fallbackFields, fallbackSectionIndices, logger),
        }
      );
      if (saveResult.success === false) {
        return { success: false, changes, error: saveResult.error };
      }
    } else if (CONFIG.APPLY && !CONFIG.DIFF_ONLY) {
      const saveResult = await executePlaywrightSave(
        page,
        targetFields,
        saveSectionIndices,
        logger
      );
      if (saveResult.success === false) {
        return { success: false, changes, error: saveResult.error };
      }
    }

    return { success: true, changes, dryRun };
  } catch (error) {
    logger(`Sync failed: ${error.message}`, 'error', 'jobkorea');
    if (error?.failLoud) {
      throw error;
    }
    return { success: false, changes: [], error: error.message };
  } finally {
    if (shouldPersistCookies) {
      await persistUpdatedCookies(handler, context);
    }
    await browser.close();
  }
}
