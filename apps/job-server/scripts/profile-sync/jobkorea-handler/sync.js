import { chromium } from 'playwright';
import { applyPlaywrightStealth } from '../playwright-stealth.js';
import { CONFIG } from '../constants.js';
import { log } from '../sync-logger.js';
import { buildJobKoreaFormData } from '@resume/shared/platform-sync/jobkorea';
import { assertJobKoreaResumeAccess } from './session.js';
import { toPlaywrightCookies } from '../../jobkorea-session/cookie-utils.js';
import { executeHybridSave, shouldUseHybridMode, getJobKoreaSyncMode } from './sync-hybrid.js';
import {
  assertJobKoreaCareerSlotCoverage,
  selectJobKoreaCareerSectionIndices,
} from '@resume/shared/platform-sync/jobkorea/career-guards';
import { pickJobKoreaBrowserProfile } from '../../jobkorea-session/user-agent-pool.js';
import {
  activateRequiredSections,
  executePlaywrightSave,
  logChangeSummary,
  persistUpdatedCookies,
} from './sync-form.js';
import { loadOrRenewJobKoreaCookies } from './sync-session-renewal.js';
import { prepareJobKoreaEditPage } from './sync-navigation.js';
import { handleJobKoreaPortfolioAndPhoto, prepareJobKoreaApiClient } from './sync-pipeline.js';

export { assertJobKoreaCareerSlotCoverage } from '@resume/shared/platform-sync/jobkorea/career-guards';

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

    const prep = await prepareJobKoreaEditPage({
      page,
      context,
      handler,
      cookies,
      options,
      logger,
      dryRun,
      ensureResumeAccess,
    });
    if (prep.cookies) {
      cookies = prep.cookies;
    }

    shouldPersistCookies = !dryRun;

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
      apiClient = await prepareJobKoreaApiClient(handler, cookies, options, logger);
    }

    await handleJobKoreaPortfolioAndPhoto({
      apiClient,
      hybridMode,
      dryRun,
      targetFields,
      page,
      ssot,
      options,
      logger,
    });

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
