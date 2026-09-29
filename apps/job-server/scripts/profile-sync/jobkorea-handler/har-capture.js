import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { applyPlaywrightStealth } from '../playwright-stealth.js';
import { CONFIG } from '../constants.js';
import { buildJobKoreaFormData } from '@resume/shared/platform-sync/jobkorea';
import { getEditUrl } from './change-detection.js';
import { assertJobKoreaResumeAccess, waitForEditableForm } from './session.js';
import { toPlaywrightCookies } from '../../jobkorea-session/cookie-utils.js';
import { pickJobKoreaBrowserProfile } from '../../jobkorea-session/user-agent-pool.js';
import {
  assertSafeHarOutputPath,
  getDefaultHarOutputPath,
  summarizeRequest,
} from './har-capture-paths.js';
import {
  activateRequiredSections,
  fillTargetFields,
  markPartialSave,
  saveForm,
} from './har-capture-form.js';

export { assertSafeHarOutputPath, getDefaultHarOutputPath };

export async function captureJobKoreaProfileSyncHar(handler, ssot, options = {}) {
  const capturedAt = new Date().toISOString();
  const harPath = assertSafeHarOutputPath(
    options.output ?? getDefaultHarOutputPath(new Date(capturedAt))
  );
  fs.mkdirSync(path.dirname(harPath), { recursive: true, mode: 0o700 });

  const cookies = handler.loadSession();
  if (!cookies) {
    return {
      success: false,
      harPath,
      editUrl: null,
      capturedAt,
      requestSummary: [],
      error: 'No session',
    };
  }

  const requestSummary = [];
  const browserProfile = pickJobKoreaBrowserProfile();
  const launchBrowser = options.launchBrowser ?? chromium.launch.bind(chromium);
  const ensureResumeAccess = options.assertJobKoreaResumeAccess ?? assertJobKoreaResumeAccess;
  const browser = await launchBrowser({ headless: options.headless ?? CONFIG.HEADLESS });
  const context = await browser.newContext({
    userAgent: browserProfile.userAgent,
    viewport: browserProfile.viewport,
    locale: browserProfile.locale,
    timezoneId: browserProfile.timezoneId,
    extraHTTPHeaders: {
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    },
    recordHar: {
      path: harPath,
      mode: 'full',
    },
  });

  await applyPlaywrightStealth(context);

  try {
    await context.addCookies(toPlaywrightCookies(cookies));
    const page = await context.newPage();
    page.on('request', (request) => {
      try {
        const url = new URL(request.url());
        if (url.hostname.endsWith('jobkorea.co.kr')) {
          requestSummary.push(summarizeRequest(request));
        }
      } catch {
        // Ignore malformed or browser-internal URLs.
      }
    });

    const editUrl = getEditUrl();
    await page.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: options.timeout ?? 30000 });
    await ensureResumeAccess(page, {
      headlessEnv: String(options.headless ?? CONFIG.HEADLESS),
      logger: options.logger,
    });

    await waitForEditableForm(page, { rNo: process.env.JOBKOREA_RNO?.trim() || '' });
    await activateRequiredSections(page);

    const sectionIndices = await handler.createEntrySlots(page, ssot);
    const portfolioFileIdx = options.includePortfolio ? sectionIndices.portfolio?.[0] : undefined;
    const targetFields = buildJobKoreaFormData(ssot, { ...sectionIndices, portfolioFileIdx });

    if (options.apply || options.includeSave) {
      await fillTargetFields(page, targetFields);
      await markPartialSave(page);
    }

    let saveResult = null;
    if (options.includeSave) {
      saveResult = await saveForm(page);
    }

    return { success: true, harPath, editUrl, capturedAt, requestSummary, saveResult };
  } catch (error) {
    return {
      success: false,
      harPath,
      editUrl: (() => {
        try {
          return getEditUrl();
        } catch {
          return null;
        }
      })(),
      capturedAt,
      requestSummary,
      error: error.message,
    };
  } finally {
    try {
      await context.close();
    } catch {
      // Context may already be closed.
    }
    await browser.close();
  }
}
