import { chromium } from 'playwright';
import { applyPlaywrightStealth } from '../playwright-stealth.js';
import { CONFIG } from '../constants.js';
import { log } from '../sync-logger.js';
import {
  buildJobKoreaFormData,
  registerPortfolioUrl as defaultRegisterPortfolioUrl,
  mapPortfolioToFormFields,
} from '../jobkorea-sections.js';
import { getEditUrl } from './change-detection.js';
import { assertJobKoreaResumeAccess } from './session.js';
import { pickJobKoreaBrowserProfile } from '../../jobkorea-session/user-agent-pool.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
async function activateRequiredSections(page) {
  await page.evaluate(() => {
    const requiredSections = [
      'InputStat_CareerInputStat',
      'InputStat_LicenseInputStat',
      'InputStat_AwardInputStat',
      'InputStat_PortfolioInputStat',
      'InputStat_SchoolInputStat',
      'InputStat_HighSchoolInputStat',
      'InputStat_SkillInputStat',
      'InputStat_LanguageInputStat',
      'InputStat_ProjectInputStat',
    ];
    for (const syncId of requiredSections) {
      const btn = $(`button[data-sync_id="${syncId}"]`);
      if (btn.length && btn.text().trim() === '필드추가') {
        btn.click();
      }
    }
  });
  await page.waitForTimeout(1000);
}

function buildPortfolioRegistrationError(portfolioUrl, timestamp) {
  const error = new Error(
    'JobKorea portfolio URL registration failed — check browser session and verify ' +
      `/User/Resume/AddUserFileDB endpoint is accessible (url=${portfolioUrl}, timestamp=${timestamp})`
  );
  error.failLoud = true;
  return error;
}

async function appendPortfolioFields(page, ssot, targetFields, options = {}) {
  const portfolioUrl = ssot?.personal?.portfolio;
  if (!portfolioUrl) {
    return;
  }

  const registerPortfolioUrl = options.registerPortfolioUrl ?? defaultRegisterPortfolioUrl;
  const logger = options.logger ?? log;
  const timestamp =
    typeof options.getTimestamp === 'function' ? options.getTimestamp() : new Date().toISOString();
  const fileIdx = await registerPortfolioUrl(page, portfolioUrl);
  if (fileIdx) {
    logger(`Portfolio URL registered: IDX=${fileIdx}`, 'info', 'jobkorea');
    targetFields.push(...mapPortfolioToFormFields(ssot, fileIdx));
    return;
  }

  const error = buildPortfolioRegistrationError(portfolioUrl, timestamp);
  if (process.env.JOBKOREA_PORTFOLIO_OPTIONAL === 'true') {
    logger(error.message, 'warn', 'jobkorea');
    return;
  }

  throw error;
}

function logChangeSummary(changes) {
  if (changes.length > 0) {
    log(`Found ${changes.length} field change(s)`, 'diff', 'jobkorea');
    for (const change of changes.slice(0, 50)) {
      log(`${change.field}: "${change.from}" -> "${change.to}"`, 'diff', 'jobkorea');
    }
    if (changes.length > 50) {
      log(`... and ${changes.length - 50} more`, 'diff', 'jobkorea');
    }
    return;
  }

  log('No changes detected', 'info', 'jobkorea');
}

async function pruneOldSectionEntries(page, sectionIndices) {
  await page.evaluate(
    (indices) => {
      const sections = [
        { prefix: 'Career', keep: new Set(indices.career) },
        { prefix: 'License', keep: new Set(indices.license) },
        { prefix: 'Award', keep: new Set(indices.award) },
        { prefix: 'Portfolio', keep: new Set(indices.portfolio) },
        { prefix: 'Skill', keep: new Set(indices.skill) },
        { prefix: 'Language', keep: new Set(indices.language) },
        { prefix: 'Project', keep: new Set(indices.personalProject) },
      ];
      for (const { prefix, keep } of sections) {
        document.querySelectorAll(`[name^="${prefix}["]`).forEach((el) => {
          const m = el.name.match(/\[([^\]]+)\]/);
          if (m && !keep.has(m[1])) el.remove();
        });
      }
    },
    {
      career: sectionIndices.career,
      license: sectionIndices.license,
      award: sectionIndices.award,
      portfolio: sectionIndices.portfolio,
      skill: sectionIndices.skill,
      language: sectionIndices.language,
      personalProject: sectionIndices.personalProject,
    }
  );
}

async function fillTargetFields(page, targetFields) {
  const fillStats = await page.evaluate((fields) => {
    const form = document.getElementById('frm1');
    let filled = 0;
    let created = 0;
    for (const { name, value } of fields) {
      const els = document.getElementsByName(name);
      if (els.length > 0) {
        els[0].value = String(value);
        els[0].dispatchEvent(new Event('change', { bubbles: true }));
        filled++;
      } else {
        const hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.name = name;
        hidden.value = String(value);
        form.appendChild(hidden);
        created++;
      }
    }
    return { filled, created };
  }, targetFields);

  log(`Filled ${fillStats.filled} DOM fields (${fillStats.created} created)`, 'info', 'jobkorea');
}

async function markPartialSave(page) {
  await page.evaluate(() => {
    const el = document.getElementsByName('hdnIsCompleteSave');
    if (el.length > 0) el[0].value = 'False';
  });
}

async function saveForm(page) {
  return page.evaluate(async () => {
    const formData = $('#frm1').serializeArray();
    const completeIdx = formData.findIndex((f) => f.name === 'hdnIsCompleteSave');
    if (completeIdx >= 0) {
      formData[completeIdx].value = 'False';
    } else {
      formData.push({ name: 'hdnIsCompleteSave', value: 'False' });
    }

    return await new Promise((resolve) => {
      $.post(`/User/Resume/Save?_=${Date.now()}`, formData, (result) => {
        resolve(result?.saveResult || result);
      }).fail((xhr) => {
        resolve({ IsSuccess: false, error: xhr.statusText || 'POST failed' });
      });
    });
  });
}

function buildSaveError(saveResult) {
  return (
    saveResult?.ErrorMessage ||
    saveResult?.FormError?.Message ||
    saveResult?.error ||
    'Unknown save error'
  );
}

async function persistUpdatedCookies(handler, context) {
  try {
    const allCookies = await context.cookies();
    const updatedCookies = allCookies.filter((c) => c.domain.includes('jobkorea.co.kr'));
    if (updatedCookies.length > 0) {
      handler.saveSession(updatedCookies);
    }
  } catch {
    // Context may already be closed on error paths.
  }
}

export async function syncJobKoreaProfile(handler, ssot, options = {}) {
  const logger = options.logger ?? log;
  const launchBrowser = options.launchBrowser ?? chromium.launch.bind(chromium);
  const ensureResumeAccess = options.assertJobKoreaResumeAccess ?? assertJobKoreaResumeAccess;

  logger('Starting sync for JobKorea (via form POST)', 'info', 'jobkorea');

  const cookies = handler.loadSession();
  if (!cookies) {
    logger('No saved session - login to JobKorea first and save cookies', 'error', 'jobkorea');
    return { success: false, changes: [] };
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
    await context.addCookies(cookies);
    const page = await context.newPage();

    const editUrl = getEditUrl();
    logger(`Navigating to ${editUrl}`, 'info', 'jobkorea');
    await page.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    if (page.url().includes('/Login')) {
      logger('Session expired on resume page, auto-renewing via Puppeteer...', 'warn', 'jobkorea');
      const { execSync } = await import('child_process');
      try {
        const renewScript = path.resolve(__dirname, '../../renew-jobkorea-session.js');
        execSync(`node "${renewScript}"`, {
          env: {
            ...process.env,
            HEADLESS: 'true',
          },
          stdio: 'inherit',
          timeout: 300000,
        });
        const renewedCookies = handler.loadSession();
        if (renewedCookies) {
          await context.clearCookies();
          await context.addCookies(renewedCookies);
          await page.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        }
      } catch (renewError) {
        throw new Error(`Session auto-renewal failed: ${renewError.message}`);
      }
    }
    await ensureResumeAccess(page, {
      headlessEnv: String(CONFIG.HEADLESS),
      logger,
    });

    // Only persist cookies after successful resume access verification
    shouldPersistCookies = true;

    await page.waitForFunction(() => typeof $ !== 'undefined' && $('#frm1').length > 0, {
      timeout: 15000,
    });

    await activateRequiredSections(page);

    const sectionIndices = await handler.createEntrySlots(page, ssot);
    logger(
      `Entry slots — Career: ${sectionIndices.career.length} (${sectionIndices.career.join(',')}), ` +
        `License: ${sectionIndices.license.length} (${sectionIndices.license.join(',')}), ` +
        `Award: ${sectionIndices.award.length} (${sectionIndices.award.join(',')}), ` +
        `School: ${sectionIndices.school}, ` +
        `Skill: ${(sectionIndices.skill || []).length} (${(sectionIndices.skill || []).join(',')}), ` +
        `Language: ${(sectionIndices.language || []).length} (${(sectionIndices.language || []).join(',')}), ` +
        `Project: ${(sectionIndices.personalProject || []).length} (${(sectionIndices.personalProject || []).join(',')})`,
      'info',
      'jobkorea'
    );

    const targetFields = buildJobKoreaFormData(ssot, sectionIndices);
    await appendPortfolioFields(page, ssot, targetFields, {
      registerPortfolioUrl: options.registerPortfolioUrl,
      logger,
      getTimestamp: options.getTimestamp,
    });

    const currentFields = await page.evaluate(() => $('#frm1').serializeArray());
    const changes = handler.computeChanges(currentFields, targetFields);
    logChangeSummary(changes);

    if (CONFIG.APPLY && !CONFIG.DIFF_ONLY) {
      await pruneOldSectionEntries(page, sectionIndices);
      await fillTargetFields(page, targetFields);
      await markPartialSave(page);

      const saveResult = await saveForm(page);
      logger(`Save response: ${JSON.stringify(saveResult).slice(0, 500)}`, 'info', 'jobkorea');

      if (saveResult?.IsSuccess === false) {
        const errorMessage = buildSaveError(saveResult);
        logger(`Save failed: ${errorMessage}`, 'error', 'jobkorea');
        return { success: false, changes, error: errorMessage };
      }

      logger('Resume form save completed', 'success', 'jobkorea');
    }

    const dryRun = !CONFIG.APPLY || CONFIG.DIFF_ONLY;
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
